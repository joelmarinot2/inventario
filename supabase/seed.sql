-- ============================================================================
-- seed.sql — Catálogo de la fábrica de achiras.
-- 4 sabores × 4 presentaciones = 16 productos, por paquetes (sin cajas).
-- Los precios y las cantidades se cargan luego desde la pantalla "Stock".
-- Es idempotente: solo inserta los que falten (no depende de índices únicos,
-- para tolerar datos duplicados de intentos previos).
-- ============================================================================

insert into public.productos
  (nombre, tipo, gramaje_g, paquetes_por_caja, precio_paquete, precio_costo,
   stock_base, stock_minimo, activo)
select v.nombre, 'empacado', v.gramaje, 1, 0, null, 0, 0, true
from (values
  ('Achiras tradicionales 100 g', 100),
  ('Achiras tradicionales 200 g', 200),
  ('Achiras tradicionales 250 g', 250),
  ('Achiras tradicionales 500 g', 500),
  ('Achiras gourmet 100 g', 100),
  ('Achiras gourmet 200 g', 200),
  ('Achiras gourmet 250 g', 250),
  ('Achiras gourmet 500 g', 500),
  ('Achiras con chocolate 100 g', 100),
  ('Achiras con chocolate 200 g', 200),
  ('Achiras con chocolate 250 g', 250),
  ('Achiras con chocolate 500 g', 500),
  ('Achiras picantes 100 g', 100),
  ('Achiras picantes 200 g', 200),
  ('Achiras picantes 250 g', 250),
  ('Achiras picantes 500 g', 500)
) as v(nombre, gramaje)
where not exists (
  select 1 from public.productos p where p.nombre = v.nombre
);
