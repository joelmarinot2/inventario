-- ============================================================================
-- 0007_presentacion.sql — Presentación tarro/bolsa por producto.
--
--  * Cada sabor y gramaje viene en TARRO y en BOLSA, cada uno con su precio.
--  * Los 16 productos actuales pasan a ser el "tarro" (conserva precios/stock);
--    el seed agrega los 16 de "bolsa".
-- ============================================================================

alter table public.productos add column if not exists presentacion text
  check (presentacion in ('tarro', 'bolsa'));

-- Los productos actuales de achiras (que terminan en "NNN g") pasan a tarro.
update public.productos
set presentacion = 'tarro',
    nombre = nombre || ' tarro'
where presentacion is null
  and nombre like 'Achiras %'
  and nombre ~ ' [0-9]+ g$';
