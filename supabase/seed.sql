-- ============================================================================
-- seed.sql — Catálogo de la fábrica de achiras.
-- 4 sabores × 4 presentaciones (g) × 2 empaques (tarro/bolsa) = 32 productos.
-- Los precios y las cantidades se cargan luego desde la pantalla "Stock".
-- Idempotente: solo inserta los que falten (no depende de índices únicos).
-- Requiere la columna presentacion (migración 0007).
-- ============================================================================

insert into public.productos
  (nombre, tipo, gramaje_g, paquetes_por_caja, precio_paquete, precio_costo,
   stock_base, stock_minimo, activo, presentacion)
select
  s.sabor || ' ' || g.gramaje || ' g ' || pr.pres,
  'empacado', g.gramaje, 1, 0, null, 0, 0, true, pr.pres
from (values
  ('Achiras tradicionales'),
  ('Achiras gourmet'),
  ('Achiras con chocolate'),
  ('Achiras picantes')
) as s(sabor)
cross join (values (100), (200), (250), (500)) as g(gramaje)
cross join (values ('tarro'), ('bolsa')) as pr(pres)
where not exists (
  select 1 from public.productos p
  where p.nombre = s.sabor || ' ' || g.gramaje || ' g ' || pr.pres
);
