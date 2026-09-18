-- ============================================================================
-- 0004_storage.sql — Bucket de Storage para las fotos de los productos.
-- Lectura pública (para mostrar las fotos); subir/cambiar solo el admin.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('fotos-productos', 'fotos-productos', true)
on conflict (id) do nothing;

-- Lectura pública de las fotos.
drop policy if exists fotos_lectura_publica on storage.objects;
create policy fotos_lectura_publica on storage.objects
  for select
  using (bucket_id = 'fotos-productos');

-- Subir fotos: solo admin.
drop policy if exists fotos_subida_admin on storage.objects;
create policy fotos_subida_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-productos' and public.es_admin());

-- Reemplazar fotos: solo admin.
drop policy if exists fotos_update_admin on storage.objects;
create policy fotos_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-productos' and public.es_admin())
  with check (bucket_id = 'fotos-productos' and public.es_admin());

-- Borrar fotos: solo admin (por ejemplo al reemplazar una foto vieja).
drop policy if exists fotos_delete_admin on storage.objects;
create policy fotos_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-productos' and public.es_admin());
