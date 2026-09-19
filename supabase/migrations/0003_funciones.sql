-- ============================================================================
-- 0003_funciones.sql — RPCs atómicas e informes.
--
-- Las escrituras de ventas/movimientos pasan SIEMPRE por estas funciones
-- SECURITY DEFINER: recalculan los valores en el servidor (nunca confían en el
-- cliente), corren en una sola transacción y son idempotentes donde hace falta.
-- Zona horaria America/Bogota para definir qué es "hoy".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- registrar_venta: inserta venta + ítems + movimientos y descuenta inventario
-- en una transacción. Idempotente por clave_idempotencia (protege doble toque).
-- p_items: array JSON de { producto_id, unidad, modo?, cantidad, valor_objetivo? }
-- ----------------------------------------------------------------------------
create or replace function public.registrar_venta(p_clave uuid, p_items jsonb)
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
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Idempotencia: si ya existe la venta con esta clave, devolverla sin reprocesar.
  select id, total into v_venta_id, v_total
    from public.ventas where clave_idempotencia = p_clave;
  if v_venta_id is not null then
    return jsonb_build_object('venta_id', v_venta_id, 'total', v_total, 'ya_existia', true);
  end if;

  -- Crear la cabecera. El UNIQUE protege del doble toque concurrente.
  begin
    insert into public.ventas (usuario_id, clave_idempotencia, total)
    values (v_uid, p_clave, 0)
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
      -- Por peso: valor = gramos × precio_kilo ÷ 1000, redondeado al múltiplo de $50.
      v_base        := v_cantidad; -- gramos
      v_cant_unidad := v_cantidad;
      v_precio_unit := coalesce(v_prod.precio_kilo, 0);
      v_subtotal    := (round((v_cantidad::numeric * v_precio_unit / 1000.0) / 50.0) * 50)::bigint;

    elsif v_unidad = 'gramo' and v_modo = 'plata' then
      -- Por plata: se cobra exactamente la plata digitada; los gramos se derivan.
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

-- ----------------------------------------------------------------------------
-- registrar_entrada: suma mercancía al inventario (cualquier usuario).
-- p_cantidad_base ya viene convertido a unidad base (paquetes o gramos).
-- ----------------------------------------------------------------------------
create or replace function public.registrar_entrada(
  p_producto uuid,
  p_cantidad_base integer,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_prev integer;
  v_nuevo integer;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if p_cantidad_base is null or p_cantidad_base <= 0 then
    raise exception 'La cantidad que llegó debe ser mayor que cero';
  end if;

  select stock_base into v_prev from public.productos where id = p_producto for update;
  if not found then
    raise exception 'Producto no existe';
  end if;

  v_nuevo := v_prev + p_cantidad_base;
  update public.productos set stock_base = v_nuevo where id = p_producto;

  insert into public.movimientos (producto_id, tipo, cantidad_base, motivo, nota, usuario_id)
  values (p_producto, 'entrada', p_cantidad_base, 'llegada', p_nota, v_uid);

  return jsonb_build_object('stock_anterior', v_prev, 'stock_nuevo', v_nuevo);
end;
$$;

-- ----------------------------------------------------------------------------
-- anular_venta: devuelve el inventario y marca la venta como anulada.
--   El vendedor solo puede anular la venta que acaba de guardar (la última suya,
--   dentro de 30 minutos). El admin puede anular cualquiera.
-- ----------------------------------------------------------------------------
create or replace function public.anular_venta(p_venta uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_venta  public.ventas%rowtype;
  v_item   public.venta_items%rowtype;
  v_ultima uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_venta from public.ventas where id = p_venta for update;
  if not found then
    raise exception 'La venta no existe';
  end if;

  if v_venta.anulada then
    -- Idempotente: ya estaba anulada.
    return jsonb_build_object('venta_id', v_venta.id, 'ya_estaba', true);
  end if;

  if not public.es_admin() then
    select id into v_ultima
      from public.ventas
      where usuario_id = v_uid and not anulada
      order by fecha desc limit 1;

    if v_venta.usuario_id <> v_uid
       or v_venta.id <> v_ultima
       or now() - v_venta.fecha > interval '30 minutes' then
      raise exception 'Solo puede deshacer la venta que acaba de guardar';
    end if;
  end if;

  for v_item in select * from public.venta_items where venta_id = p_venta
  loop
    update public.productos
      set stock_base = stock_base + v_item.cantidad_base
      where id = v_item.producto_id;

    insert into public.movimientos (producto_id, tipo, cantidad_base, venta_id, usuario_id, motivo)
    values (v_item.producto_id, 'anulacion', v_item.cantidad_base, p_venta, v_uid, 'anulacion');
  end loop;

  update public.ventas set anulada = true, anulada_en = now() where id = p_venta;

  return jsonb_build_object('venta_id', v_venta.id, 'ya_estaba', false);
end;
$$;

-- ----------------------------------------------------------------------------
-- ajustar_inventario: fija el stock a un nuevo valor con un motivo (solo admin).
--   Motivos: conteo, merma, dano, otro.
-- ----------------------------------------------------------------------------
create or replace function public.ajustar_inventario(
  p_producto uuid,
  p_nuevo_stock integer,
  p_motivo text,
  p_nota text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_prev  integer;
  v_delta integer;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if not public.es_admin() then
    raise exception 'Solo el administrador puede ajustar el inventario';
  end if;
  if p_motivo not in ('conteo', 'merma', 'dano', 'otro') then
    raise exception 'Motivo inválido';
  end if;

  select stock_base into v_prev from public.productos where id = p_producto for update;
  if not found then
    raise exception 'Producto no existe';
  end if;

  v_delta := p_nuevo_stock - v_prev;
  update public.productos set stock_base = p_nuevo_stock where id = p_producto;

  insert into public.movimientos (producto_id, tipo, cantidad_base, motivo, nota, usuario_id)
  values (p_producto, 'ajuste', v_delta, p_motivo, p_nota, v_uid);

  return jsonb_build_object('stock_anterior', v_prev, 'stock_nuevo', p_nuevo_stock, 'delta', v_delta);
end;
$$;

-- ----------------------------------------------------------------------------
-- resumen_dia: total vendido y número de ventas de un día (zona Bogota).
-- ----------------------------------------------------------------------------
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
    'num_ventas', count(*)
  )
  from public.ventas
  where not anulada
    and (fecha at time zone 'America/Bogota')::date = p_fecha;
$$;

-- ----------------------------------------------------------------------------
-- informe_diario: vendido por producto en un día (zona Bogota). Incluye la
-- configuración del producto y el stock actual para poder formatear en la app.
-- ----------------------------------------------------------------------------
create or replace function public.informe_diario(
  p_fecha date default (now() at time zone 'America/Bogota')::date
)
returns table (
  producto_id           uuid,
  nombre                text,
  tipo                  text,
  gramaje_g             integer,
  paquetes_por_caja     integer,
  gramos_por_caja       integer,
  stock_base            integer,
  cantidad_base_vendida bigint,
  valor_vendido         bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.nombre, p.tipo,
    p.gramaje_g, p.paquetes_por_caja, p.gramos_por_caja, p.stock_base,
    coalesce(sum(vi.cantidad_base), 0)::bigint,
    coalesce(sum(vi.subtotal), 0)::bigint
  from public.productos p
  join public.venta_items vi on vi.producto_id = p.id
  join public.ventas v on v.id = vi.venta_id
  where not v.anulada
    and (v.fecha at time zone 'America/Bogota')::date = p_fecha
  group by p.id, p.nombre, p.tipo, p.gramaje_g, p.paquetes_por_caja, p.gramos_por_caja, p.stock_base
  order by coalesce(sum(vi.subtotal), 0) desc;
$$;

-- ----------------------------------------------------------------------------
-- informe_rango: vendido por producto entre dos fechas (solo admin). Export.
-- ----------------------------------------------------------------------------
create or replace function public.informe_rango(
  p_desde date,
  p_hasta date
)
returns table (
  producto_id           uuid,
  nombre                text,
  tipo                  text,
  gramaje_g             integer,
  paquetes_por_caja     integer,
  gramos_por_caja       integer,
  cantidad_base_vendida bigint,
  valor_vendido         bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede ver informes por rango';
  end if;

  return query
    select
      p.id, p.nombre, p.tipo,
      p.gramaje_g, p.paquetes_por_caja, p.gramos_por_caja,
      coalesce(sum(vi.cantidad_base), 0)::bigint,
      coalesce(sum(vi.subtotal), 0)::bigint
    from public.productos p
    join public.venta_items vi on vi.producto_id = p.id
    join public.ventas v on v.id = vi.venta_id
    where not v.anulada
      and (v.fecha at time zone 'America/Bogota')::date between p_desde and p_hasta
    group by p.id, p.nombre, p.tipo, p.gramaje_g, p.paquetes_por_caja, p.gramos_por_caja
    order by coalesce(sum(vi.subtotal), 0) desc;
end;
$$;

-- ----------------------------------------------------------------------------
-- ranking_productos: cuántas veces se ha vendido cada producto (para "más
-- vendidos primero" en VENDER).
-- ----------------------------------------------------------------------------
create or replace function public.ranking_productos()
returns table (producto_id uuid, veces bigint)
language sql
security definer
set search_path = public
stable
as $$
  select vi.producto_id, count(*)::bigint
  from public.venta_items vi
  join public.ventas v on v.id = vi.venta_id
  where not v.anulada
  group by vi.producto_id;
$$;

-- ----------------------------------------------------------------------------
-- GRANT EXECUTE al rol authenticated (sin esto la API no expone las funciones).
-- ----------------------------------------------------------------------------
grant execute on function public.registrar_venta(uuid, jsonb)                to authenticated;
grant execute on function public.registrar_entrada(uuid, integer, text)      to authenticated;
grant execute on function public.anular_venta(uuid)                          to authenticated;
grant execute on function public.ajustar_inventario(uuid, integer, text, text) to authenticated;
grant execute on function public.resumen_dia(date)                           to authenticated;
grant execute on function public.informe_diario(date)                        to authenticated;
grant execute on function public.informe_rango(date, date)                   to authenticated;
grant execute on function public.ranking_productos()                         to authenticated;
