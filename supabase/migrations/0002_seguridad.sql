-- ============================================================================
-- 0002_seguridad.sql — RLS, permisos de rol validados en la base, y GRANTs.
--
-- En proyectos nuevos de Supabase las tablas NO quedan expuestas a la API
-- automáticamente: hay que activar RLS, crear políticas y dar GRANT explícito
-- al rol authenticated. El registro público está desactivado; los usuarios los
-- crea el administrador.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ¿El usuario actual es admin? SECURITY DEFINER para no chocar con la RLS de
-- perfiles (evita recursión en las políticas).
-- ----------------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Al crear un usuario en auth, crear su perfil. Rol por defecto: vendedor.
-- (El registro público está desactivado; solo el admin crea usuarios.)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'rol', ''), 'vendedor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Activar RLS en todas las tablas.
-- ----------------------------------------------------------------------------
alter table public.perfiles    enable row level security;
alter table public.productos   enable row level security;
alter table public.ventas      enable row level security;
alter table public.venta_items enable row level security;
alter table public.movimientos enable row level security;

-- ----------------------------------------------------------------------------
-- Políticas: perfiles
--   Ver el propio perfil (para saber el rol) o todos si es admin.
--   Crear/editar perfiles: solo admin. Nada se borra.
-- ----------------------------------------------------------------------------
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.es_admin());

drop policy if exists perfiles_insert on public.perfiles;
create policy perfiles_insert on public.perfiles
  for insert to authenticated
  with check (public.es_admin());

drop policy if exists perfiles_update on public.perfiles;
create policy perfiles_update on public.perfiles
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ----------------------------------------------------------------------------
-- Políticas: productos
--   Ver: cualquier usuario autenticado. Crear/editar: solo admin.
-- ----------------------------------------------------------------------------
drop policy if exists productos_select on public.productos;
create policy productos_select on public.productos
  for select to authenticated
  using (true);

drop policy if exists productos_insert on public.productos;
create policy productos_insert on public.productos
  for insert to authenticated
  with check (public.es_admin());

drop policy if exists productos_update on public.productos;
create policy productos_update on public.productos
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ----------------------------------------------------------------------------
-- Políticas: ventas, venta_items, movimientos
--   Ver: cualquier usuario autenticado (para informes y "Deshacer").
--   Escribir: SOLO por las funciones RPC (SECURITY DEFINER); no hay política de
--   escritura directa, así que un cliente no puede insertar a mano.
-- ----------------------------------------------------------------------------
drop policy if exists ventas_select on public.ventas;
create policy ventas_select on public.ventas
  for select to authenticated
  using (true);

drop policy if exists venta_items_select on public.venta_items;
create policy venta_items_select on public.venta_items
  for select to authenticated
  using (true);

drop policy if exists movimientos_select on public.movimientos;
create policy movimientos_select on public.movimientos
  for select to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- GRANTs explícitos al rol authenticated.
--   Lectura en todas; escritura directa solo en productos y perfiles (además
--   la RLS exige admin). Las ventas/movimientos se escriben vía RPC.
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select on public.perfiles    to authenticated;
grant select on public.productos   to authenticated;
grant select on public.ventas      to authenticated;
grant select on public.venta_items to authenticated;
grant select on public.movimientos to authenticated;

grant insert, update on public.perfiles  to authenticated;
grant insert, update on public.productos to authenticated;

grant execute on function public.es_admin() to authenticated;
