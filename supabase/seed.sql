-- ============================================================================
-- seed.sql — Catálogo de la fábrica de achiras.
-- 4 sabores × 4 presentaciones = 16 productos, por paquetes (sin cajas).
-- Los precios y las cantidades se cargan luego desde la pantalla "Stock".
-- Requiere la restricción de nombre único (migración 0005). Es idempotente.
-- ============================================================================

insert into public.productos
  (nombre, tipo, gramaje_g, paquetes_por_caja, precio_paquete, precio_costo,
   stock_base, stock_minimo, activo)
values
  ('Achiras tradicionales 100 g',  'empacado', 100, 1, 0, null, 0, 0, true),
  ('Achiras tradicionales 200 g',  'empacado', 200, 1, 0, null, 0, 0, true),
  ('Achiras tradicionales 250 g',  'empacado', 250, 1, 0, null, 0, 0, true),
  ('Achiras tradicionales 500 g',  'empacado', 500, 1, 0, null, 0, 0, true),

  ('Achiras gourmet 100 g',        'empacado', 100, 1, 0, null, 0, 0, true),
  ('Achiras gourmet 200 g',        'empacado', 200, 1, 0, null, 0, 0, true),
  ('Achiras gourmet 250 g',        'empacado', 250, 1, 0, null, 0, 0, true),
  ('Achiras gourmet 500 g',        'empacado', 500, 1, 0, null, 0, 0, true),

  ('Achiras con chocolate 100 g',  'empacado', 100, 1, 0, null, 0, 0, true),
  ('Achiras con chocolate 200 g',  'empacado', 200, 1, 0, null, 0, 0, true),
  ('Achiras con chocolate 250 g',  'empacado', 250, 1, 0, null, 0, 0, true),
  ('Achiras con chocolate 500 g',  'empacado', 500, 1, 0, null, 0, 0, true),

  ('Achiras picantes 100 g',       'empacado', 100, 1, 0, null, 0, 0, true),
  ('Achiras picantes 200 g',       'empacado', 200, 1, 0, null, 0, 0, true),
  ('Achiras picantes 250 g',       'empacado', 250, 1, 0, null, 0, 0, true),
  ('Achiras picantes 500 g',       'empacado', 500, 1, 0, null, 0, 0, true)
on conflict (nombre) do nothing;
