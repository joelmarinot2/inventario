-- ============================================================================
-- seed.sql — 8 productos de ejemplo (5 empacados y 3 a granel).
-- El stock se pone directo para tener datos con qué probar el semáforo.
-- Ejecuta este archivo DESPUÉS de las migraciones (ver README).
-- ============================================================================

insert into public.productos
  (nombre, tipo, gramaje_g, paquetes_por_caja, precio_paquete,
   gramos_por_caja, precio_kilo, precio_caja, stock_base, stock_minimo, activo)
values
  -- Empacados (unidad base = paquete) -------------------------------------
  ('Maní salado 250 g',   'empacado', 250, 24, 3000,  null, null, null,   82, 12, true), -- suficiente
  ('Arroz 500 g',         'empacado', 500, 20, 2500,  null, null, 48000,  45, 20, true), -- suficiente, precio_caja fijo
  ('Lentejas 500 g',      'empacado', 500, 24, 3200,  null, null, null,   30, 12, true), -- suficiente
  ('Panela 500 g',        'empacado', 500, 25, 2800,  null, null, null,    8, 15, true), -- queda poco
  ('Chocolate 250 g',     'empacado', 250, 24, 4500,  null, null, null,    0, 10, true), -- se acabó

  -- Granel (unidad base = gramo) ------------------------------------------
  ('Maní a granel',       'granel',   null, null, null, 25000, 18000, null, 53500,  5000, true), -- suficiente
  ('Arroz a granel',      'granel',   null, null, null, 50000,  3800, null, 120000, 10000, true), -- suficiente
  ('Fríjol a granel',     'granel',   null, null, null, 25000,  9000, null,   3000,  8000, true); -- queda poco
