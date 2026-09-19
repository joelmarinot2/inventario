-- ============================================================================
-- 0006_pagos_caja.sql — Método de pago (con vuelto) y caja (apertura/cierre).
--
--  * Cada venta guarda con qué se pagó (efectivo/transferencia/tarjeta/otro) y,
--    si es efectivo, cuánto entregó el cliente (para calcular el vuelto).
--  * "Iniciar día" abre una caja con una base en efectivo; "Cerrar caja" la
--    cierra y muestra cuánto hay en efectivo, transferencias, etc.
--  * Reaplica los GRANT EXECUTE (por si el 0003 no alcanzó a aplicarlos).
-- ============================================================================

-- ---- Método de pago en la venta ----
alter table public.ventas
  add column if not exists metodo_pago text
  check (metodo_pago in ('efectivo', 'transferencia', 'tarjeta', 'otro'));
alter table public.ventas
  add column if not exists pago_recibido bigint; -- efectivo entregado (opcional)

-- ---- Caja (jornada) ----
create table if not exists public.cajas (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid references public.perfiles (id),
  base_efectivo  bigint not null default 0,
  abierta_en     timestamptz not null default now(),
  cerrada        boolean not null default false,
  cerrada_en     timestamptz,
  nota           text
);

alter table public.cajas enable row level security;

drop policy if exists cajas_select on public.cajas;
create policy cajas_select on public.cajas
  for select to authenticated using (true);

grant select on public.cajas to authenticated;

-- ---- registrar_venta con método de pago (reemplaza la anterior) ----
drop function if exists public.registrar_venta(uuid, jsonb);

create or replace function public.registrar_venta(
  p_clave uuid,
  p_items jsonb,
  p_metodo text default 'efectivo',
  p_recibido bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_venta_id       uuid;
  v_total          bigint := 0;
  v_item           jsonb;
  v_prod           public.productos%rowtype;
  v_unidad         text;
  v_modo           text;
  v_cantidad       integer;
  v_valor_objetivo bigint;
  v_base           integer;
  v_cant_unidad    integer;
  v_precio_unit    bigint;
  v_subtotal       bigint;
  v_metodo         text := coalesce(nullif(p_metodo, ''), 'efectivo');
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if v_metodo not in ('efectivo', 'transferencia', 'tarjeta', 'otro') then
    v_metodo := 'efectivo';
  end if;

  select id, total into v_venta_id, v_total
    from public.ventas where clave_idempotencia = p_clave;
  if v_venta_id is not null then
    return jsonb_build_object('venta_id', v_venta_id, 'total', v_total, 'ya_existia', true);
  end if;

  begin
    insert into public.ventas (usuario_id, clave_idempotencia, total, metodo_pago, pago_recibido)
    values (v_uid, p_clave, 0, v_metodo, p_recibido)
    returning id into v_venta_id;
  exception when unique_violation then
    select id, total into v_venta_id, v_total
      from public.ventas where clave_idempotencia = p_clave;
    return jsonb_build_object('venta_id', v_venta_id, 'total', v_total, 'ya_existia', true);
  end;

  -- La consulta de idempotencia dejó v_total en NULL al no encontrar venta;
  -- se reinicia en 0 para acumular los subtotales sin envenenar con NULL.
  v_total := 0;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_prod from public.productos
      where id = (v_item ->> 'producto_id')::uuid
      for update;
    if not found then
      raise exception 'Producto no existe: %', v_item ->> 'producto_id';
    end if;

    v_unidad         := v_item ->> 'unidad';
    v_modo           := v_item ->> 'modo';
    v_cantidad       := coalesce((v_item ->> 'cantidad')::integer, 0);
    v_valor_objetivo := coalesce((v_item ->> 'valor_objetivo')::bigint, 0);

    if v_unidad = 'paquete' then
      v_base        := v_cantidad;
      v_cant_unidad := v_cantidad;
      v_precio_unit := coalesce(v_prod.precio_paquete, 0);
      v_subtotal    := v_cantidad::bigint * v_precio_unit;

    elsif v_unidad = 'caja' and v_prod.tipo = 'empacado' then
      v_base        := v_cantidad * coalesce(v_prod.paquetes_por_caja, 0);
      v_cant_unidad := v_cantidad;
      v_precio_unit := coalesce(
        v_prod.precio_caja,
        coalesce(v_prod.paquetes_por_caja, 0) * coalesce(v_prod.precio_paquete, 0)
      );
      v_subtotal    := v_cantidad::bigint * v_precio_unit;

    elsif v_unidad = 'caja' and v_prod.tipo = 'granel' then
      v_base        := v_cantidad * coalesce(v_prod.gramos_por_caja, 0);
      v_cant_unidad := v_cantidad;
      v_precio_unit := coalesce(
        v_prod.precio_caja,
        round(coalesce(v_prod.gramos_por_caja, 0)::numeric * coalesce(v_prod.precio_kilo, 0) / 1000.0)
      );
      v_subtotal    := v_cantidad::bigint * v_precio_unit;

    elsif v_unidad = 'gramo' and coalesce(v_modo, 'peso') = 'peso' then
      v_base        := v_cantidad;
      v_cant_unidad := v_cantidad;
      v_precio_unit := coalesce(v_prod.precio_kilo, 0);
      v_subtotal    := (round((v_cantidad::numeric * v_precio_unit / 1000.0) / 50.0) * 50)::bigint;

    elsif v_unidad = 'gramo' and v_modo = 'plata' then
      v_precio_unit := coalesce(v_prod.precio_kilo, 0);
      if v_precio_unit <= 0 then
        v_base := 0;
      else
        v_base := round(v_valor_objetivo::numeric * 1000 / v_precio_unit)::integer;
      end if;
      v_cant_unidad := v_base;
      v_subtotal    := v_valor_objetivo;

    else
      raise exception 'Unidad/modo inválido: % / %', v_unidad, v_modo;
    end if;

    insert into public.venta_items
      (venta_id, producto_id, unidad, cantidad, cantidad_base, precio_unitario, subtotal)
    values
      (v_venta_id, v_prod.id, v_unidad, v_cant_unidad, v_base, v_precio_unit, v_subtotal);

    insert into public.movimientos (producto_id, tipo, cantidad_base, venta_id, usuario_id)
    values (v_prod.id, 'venta', -v_base, v_venta_id, v_uid);

    update public.productos set stock_base = stock_base - v_base where id = v_prod.id;

    v_total := v_total + v_subtotal;
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;

  return jsonb_build_object('venta_id', v_venta_id, 'total', v_total, 'ya_existia', false);
end;
$$;

-- ---- resumen_dia con desglose por método de pago ----
create or replace function public.resumen_dia(
  p_fecha date default (now() at time zone 'America/Bogota')::date
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'fecha', p_fecha,
    'total', coalesce(sum(total), 0),
    'num_ventas', count(*),
    'efectivo', coalesce(sum(total) filter (where metodo_pago = 'efectivo'), 0),
    'transferencia', coalesce(sum(total) filter (where metodo_pago = 'transferencia'), 0),
    'tarjeta', coalesce(sum(total) filter (where metodo_pago = 'tarjeta'), 0),
    'otro', coalesce(sum(total) filter (where metodo_pago = 'otro' or metodo_pago is null), 0)
  )
  from public.ventas
  where not anulada
    and (fecha at time zone 'America/Bogota')::date = p_fecha;
$$;

-- ---- Caja: abrir, consultar, resumir, cerrar ----
create or replace function public.abrir_caja(p_base bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select id into v_id from public.cajas where not cerrada order by abierta_en desc limit 1;
  if v_id is not null then
    return jsonb_build_object('caja_id', v_id, 'ya_abierta', true);
  end if;

  insert into public.cajas (usuario_id, base_efectivo)
  values (v_uid, coalesce(p_base, 0))
  returning id into v_id;

  return jsonb_build_object('caja_id', v_id, 'ya_abierta', false);
end;
$$;

create or replace function public.caja_abierta()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'caja_id', id,
    'base_efectivo', base_efectivo,
    'abierta_en', abierta_en
  )
  from public.cajas where not cerrada order by abierta_en desc limit 1;
$$;

create or replace function public.resumen_caja(p_caja_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_caja  public.cajas%rowtype;
  v_hasta timestamptz;
begin
  if p_caja_id is null then
    select * into v_caja from public.cajas where not cerrada order by abierta_en desc limit 1;
  else
    select * into v_caja from public.cajas where id = p_caja_id;
  end if;
  if not found then
    return null;
  end if;

  v_hasta := coalesce(v_caja.cerrada_en, now());

  return (
    select jsonb_build_object(
      'caja_id', v_caja.id,
      'base_efectivo', v_caja.base_efectivo,
      'abierta_en', v_caja.abierta_en,
      'cerrada', v_caja.cerrada,
      'cerrada_en', v_caja.cerrada_en,
      'efectivo', coalesce(sum(total) filter (where metodo_pago = 'efectivo'), 0),
      'transferencia', coalesce(sum(total) filter (where metodo_pago = 'transferencia'), 0),
      'tarjeta', coalesce(sum(total) filter (where metodo_pago = 'tarjeta'), 0),
      'otro', coalesce(sum(total) filter (where metodo_pago = 'otro' or metodo_pago is null), 0),
      'total', coalesce(sum(total), 0),
      'num_ventas', count(*)
    )
    from public.ventas
    where not anulada
      and fecha >= v_caja.abierta_en
      and fecha <= v_hasta
  );
end;
$$;

create or replace function public.cerrar_caja()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caja public.cajas%rowtype;
  v_res  jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_caja from public.cajas where not cerrada order by abierta_en desc limit 1;
  if not found then
    raise exception 'No hay caja abierta';
  end if;

  update public.cajas set cerrada = true, cerrada_en = now() where id = v_caja.id;
  select public.resumen_caja(v_caja.id) into v_res;
  return v_res;
end;
$$;

-- ---- GRANT EXECUTE (reaplicado, por si faltaba) ----
grant execute on function public.registrar_venta(uuid, jsonb, text, bigint)     to authenticated;
grant execute on function public.registrar_entrada(uuid, integer, text)         to authenticated;
grant execute on function public.anular_venta(uuid)                             to authenticated;
grant execute on function public.ajustar_inventario(uuid, integer, text, text)  to authenticated;
grant execute on function public.resumen_dia(date)                              to authenticated;
grant execute on function public.informe_diario(date)                           to authenticated;
grant execute on function public.informe_rango(date, date)                      to authenticated;
grant execute on function public.ranking_productos()                            to authenticated;
grant execute on function public.abrir_caja(bigint)                             to authenticated;
grant execute on function public.caja_abierta()                                 to authenticated;
grant execute on function public.resumen_caja(uuid)                             to authenticated;
grant execute on function public.cerrar_caja()                                  to authenticated;
grant execute on function public.es_admin()                                     to authenticated;
