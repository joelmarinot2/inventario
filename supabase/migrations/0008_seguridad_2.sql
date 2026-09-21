-- ============================================================================
-- 0008_seguridad_2.sql — Endurecimiento tras la revisión de seguridad.
--
--  1. El rol de un usuario nuevo se toma de app_metadata (solo el servidor
--     puede escribirlo), nunca de user_metadata (lo controla el cliente).
--  2. Backfill de perfiles para usuarios de auth que no tengan perfil.
--  3. Las funciones NO son ejecutables por anon/public (solo authenticated).
--  4. registrar_venta valida los ítems (cantidades > 0, unidad según tipo,
--     producto activo, lista no vacía) y exige una caja abierta.
--  5. Solo puede haber UNA caja abierta a la vez (índice único parcial).
--  6. El vendedor solo puede deshacer la venta que ACABA de guardar.
--  7. El admin no puede degradarse a sí mismo; no puede cambiar stock_base
--     directamente (solo con ajustar_inventario, que deja movimiento).
--  8. Filtros por fecha que aprovechan el índice de ventas.fecha.
-- Se puede ejecutar más de una vez.
-- ============================================================================

-- ---- 1. Trigger de perfil: rol desde app_metadata, validado ----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text := new.raw_app_meta_data ->> 'rol';
begin
  if v_rol is null or v_rol not in ('admin', 'vendedor') then
    v_rol := 'vendedor';
  end if;

  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nombre', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      ''
    ),
    v_rol
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- El trigger lo dispara el servicio de Auth.
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- ---- 2. Backfill: usuarios sin perfil ---------------------------------------
insert into public.perfiles (id, nombre, rol)
select u.id, split_part(coalesce(u.email, ''), '@', 1), 'vendedor'
from auth.users u
where not exists (select 1 from public.perfiles p where p.id = u.id);

-- ---- 7a. El admin no puede quitarse a sí mismo el rol de admin --------------
drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin() and (id <> auth.uid() or rol = 'admin'));

-- ---- 7b. stock_base solo cambia por funciones (deja movimiento) -------------
revoke update on public.productos from authenticated;
grant update (
  nombre, tipo, gramaje_g, paquetes_por_caja, precio_paquete,
  gramos_por_caja, precio_kilo, precio_caja, precio_costo,
  stock_minimo, foto_url, activo, presentacion
) on public.productos to authenticated;

-- ---- Bucket: el listado de archivos solo para usuarios autenticados ---------
-- (la descarga por URL pública no necesita política porque el bucket es público)
drop policy if exists fotos_lectura_publica on storage.objects;
create policy fotos_lectura_publica on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-productos');

-- ---- 5. Una sola caja abierta ----------------------------------------------
create unique index if not exists cajas_una_abierta
  on public.cajas ((true)) where not cerrada;

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
  if p_base is not null and p_base < 0 then
    raise exception 'La base no puede ser negativa';
  end if;

  select id into v_id from public.cajas where not cerrada order by abierta_en desc limit 1;
  if v_id is not null then
    return jsonb_build_object('caja_id', v_id, 'ya_abierta', true);
  end if;

  begin
    insert into public.cajas (usuario_id, base_efectivo)
    values (v_uid, coalesce(p_base, 0))
    returning id into v_id;
  exception when unique_violation then
    -- Otro equipo la abrió al mismo tiempo: devolver esa.
    select id into v_id from public.cajas where not cerrada order by abierta_en desc limit 1;
    return jsonb_build_object('caja_id', v_id, 'ya_abierta', true);
  end;

  return jsonb_build_object('caja_id', v_id, 'ya_abierta', false);
end;
$$;

-- ---- 6. Deshacer: solo la venta que acaba de guardar (aunque haya anulado) --
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
    return jsonb_build_object('venta_id', v_venta.id, 'ya_estaba', true);
  end if;

  if not public.es_admin() then
    -- La última venta del vendedor, incluyendo las ya anuladas: así no puede
    -- ir deshaciendo hacia atrás en cadena.
    select id into v_ultima
      from public.ventas
      where usuario_id = v_uid
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

-- ---- 4. registrar_venta con validación de ítems -----------------------------
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
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;
  if p_recibido is not null and p_recibido < 0 then
    raise exception 'El efectivo recibido no puede ser negativo';
  end if;

  select id, total into v_venta_id, v_total
    from public.ventas where clave_idempotencia = p_clave;
  if v_venta_id is not null then
    return jsonb_build_object('venta_id', v_venta_id, 'total', v_total, 'ya_existia', true);
  end if;

  -- No se vende sin caja abierta (la regla también vive en el servidor, no
  -- solo en la pantalla). Va después de la idempotencia para que un reintento
  -- de una venta ya guardada siga respondiendo "ya_existia".
  if not exists (select 1 from public.cajas where not cerrada) then
    raise exception 'No hay caja abierta. Primero toca "Iniciar día".';
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

  v_total := 0;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_prod from public.productos
      where id = (v_item ->> 'producto_id')::uuid
      for update;
    if not found then
      raise exception 'Producto no existe: %', v_item ->> 'producto_id';
    end if;
    if not v_prod.activo then
      raise exception 'El producto % está inactivo', v_prod.nombre;
    end if;

    v_unidad         := v_item ->> 'unidad';
    v_modo           := coalesce(v_item ->> 'modo', 'peso');
    v_cantidad       := coalesce((v_item ->> 'cantidad')::integer, 0);
    v_valor_objetivo := coalesce((v_item ->> 'valor_objetivo')::bigint, 0);

    -- Validaciones: la unidad debe corresponder al tipo y las cantidades ser > 0.
    if v_unidad = 'paquete' and v_prod.tipo <> 'empacado' then
      raise exception 'Unidad no aplica al producto %', v_prod.nombre;
    end if;
    if v_unidad = 'gramo' and v_prod.tipo <> 'granel' then
      raise exception 'Unidad no aplica al producto %', v_prod.nombre;
    end if;
    if v_unidad = 'gramo' and v_modo = 'plata' then
      if v_valor_objetivo <= 0 then
        raise exception 'Valor inválido para %', v_prod.nombre;
      end if;
    elsif v_cantidad <= 0 then
      raise exception 'Cantidad inválida para %', v_prod.nombre;
    end if;

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

    elsif v_unidad = 'gramo' and v_modo = 'peso' then
      v_base        := v_cantidad;
      v_cant_unidad := v_cantidad;
      v_precio_unit := coalesce(v_prod.precio_kilo, 0);
      v_subtotal    := (round((v_cantidad::numeric * v_precio_unit / 1000.0) / 50.0) * 50)::bigint;

    elsif v_unidad = 'gramo' and v_modo = 'plata' then
      v_precio_unit := coalesce(v_prod.precio_kilo, 0);
      if v_precio_unit <= 0 then
        raise exception 'El producto % no tiene precio por kilo', v_prod.nombre;
      end if;
      v_base        := round(v_valor_objetivo::numeric * 1000 / v_precio_unit)::integer;
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

-- ---- 8. Informes: filtros por rango (usan el índice) y solo autenticados ----
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
  where auth.uid() is not null
    and not anulada
    and fecha >= (p_fecha::timestamp at time zone 'America/Bogota')
    and fecha <  ((p_fecha + 1)::timestamp at time zone 'America/Bogota');
$$;

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
  where auth.uid() is not null
    and not v.anulada
    and v.fecha >= (p_fecha::timestamp at time zone 'America/Bogota')
    and v.fecha <  ((p_fecha + 1)::timestamp at time zone 'America/Bogota')
  group by p.id, p.nombre, p.tipo, p.gramaje_g, p.paquetes_por_caja, p.gramos_por_caja, p.stock_base
  order by coalesce(sum(vi.subtotal), 0) desc;
$$;

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
      and v.fecha >= (p_desde::timestamp at time zone 'America/Bogota')
      and v.fecha <  ((p_hasta + 1)::timestamp at time zone 'America/Bogota')
    group by p.id, p.nombre, p.tipo, p.gramaje_g, p.paquetes_por_caja, p.gramos_por_caja
    order by coalesce(sum(vi.subtotal), 0) desc;
end;
$$;

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
  where auth.uid() is not null and not v.anulada
  group by vi.producto_id;
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
  from public.cajas
  where auth.uid() is not null and not cerrada
  order by abierta_en desc limit 1;
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
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

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

-- ---- 3. Las funciones solo las ejecuta authenticated -------------------------
-- Por defecto Postgres da EXECUTE a PUBLIC; se retira (también para funciones
-- futuras) y se vuelve a dar solo al rol authenticated.
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public;

grant execute on function public.es_admin()                                     to authenticated;
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
grant execute on function public.handle_new_user()                              to supabase_auth_admin;
