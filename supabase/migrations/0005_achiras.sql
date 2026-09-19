-- ============================================================================
-- 0005_achiras.sql — Ajustes para la fábrica de achiras.
--
--  * Agrega "valor de la empresa" (precio_costo): el costo de producción, solo
--    de referencia interna. La venta SIEMPRE cobra el valor del producto final
--    (precio_paquete).
--  * Deja inactivos los productos de ejemplo. El catálogo de achiras se carga
--    con supabase/seed.sql.
-- ============================================================================

-- "Valor de la empresa" (costo). El GRANT de la tabla ya cubre esta columna.
alter table public.productos add column if not exists precio_costo bigint;

-- Ocultar los productos de ejemplo (nada se borra: quedan inactivos).
update public.productos set activo = false
where nombre in (
  'Maní salado 250 g', 'Arroz 500 g', 'Lentejas 500 g', 'Panela 500 g',
  'Chocolate 250 g', 'Maní a granel', 'Arroz a granel', 'Fríjol a granel'
);
