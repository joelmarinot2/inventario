-- ============================================================================
-- 0005_achiras.sql — Ajustes para la fábrica de achiras.
--
--  * Agrega "valor de la empresa" (precio_costo): el costo de producción, solo
--    de referencia interna. La venta SIEMPRE cobra el valor del producto final
--    (precio_paquete).
--  * Catálogo fijo: 4 sabores × 4 presentaciones = 16 productos, por paquetes
--    (sin cajas). Los productos de ejemplo se dejan inactivos.
-- ============================================================================

-- "Valor de la empresa" (costo). El GRANT de la tabla ya cubre esta columna.
alter table public.productos add column if not exists precio_costo bigint;

-- Nombres únicos, para poder cargar el catálogo de forma idempotente.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'productos_nombre_unique'
  ) then
    alter table public.productos add constraint productos_nombre_unique unique (nombre);
  end if;
end $$;

-- Ocultar los productos de ejemplo (nada se borra: quedan inactivos).
update public.productos set activo = false
where nombre in (
  'Maní salado 250 g', 'Arroz 500 g', 'Lentejas 500 g', 'Panela 500 g',
  'Chocolate 250 g', 'Maní a granel', 'Arroz a granel', 'Fríjol a granel'
);
