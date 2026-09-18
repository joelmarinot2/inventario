-- ============================================================================
-- 0001_schema.sql — Tablas del inventario y ventas.
--
-- Reglas clave:
--  * El inventario se guarda SIEMPRE en la unidad base y como entero:
--    paquetes (empacado) o gramos (granel). Nada de float ni decimales.
--  * La plata (pesos colombianos) se guarda como entero (bigint), sin decimales.
--  * stock_base puede ser negativo (nunca se bloquea una venta por inventario).
--  * Nada se borra: las ventas se anulan, el inventario se ajusta con motivo.
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- perfiles: un perfil por usuario de auth. El rol se valida en la base.
-- ----------------------------------------------------------------------------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  rol        text not null default 'vendedor'
             check (rol in ('admin', 'vendedor')),
  creado_en  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- productos: empacado (unidad base = paquete) o granel (unidad base = gramo).
-- Los CHECK exigen los campos según el tipo.
-- ----------------------------------------------------------------------------
create table if not exists public.productos (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  tipo               text not null check (tipo in ('empacado', 'granel')),

  -- Empacado
  gramaje_g          integer,          -- gramos por paquete
  paquetes_por_caja  integer,
  precio_paquete     bigint,           -- pesos por paquete

  -- Granel
  gramos_por_caja    integer,          -- peso de la caja/bulto en que llega
  precio_kilo        bigint,           -- pesos por kilo

  -- Común
  precio_caja        bigint,           -- opcional; vacío = se calcula
  stock_base         integer not null default 0,   -- entero, puede ser negativo
  stock_minimo       integer not null default 0,    -- entero, en unidad base
  foto_url           text,
  activo             boolean not null default true,
  creado_en          timestamptz not null default now(),

  -- El tipo exige unos campos y prohíbe los del otro tipo.
  constraint productos_empacado_ok check (
    tipo <> 'empacado' or (
      gramaje_g is not null and gramaje_g > 0
      and paquetes_por_caja is not null and paquetes_por_caja > 0
      and precio_paquete is not null and precio_paquete >= 0
      and gramos_por_caja is null and precio_kilo is null
    )
  ),
  constraint productos_granel_ok check (
    tipo <> 'granel' or (
      gramos_por_caja is not null and gramos_por_caja > 0
      and precio_kilo is not null and precio_kilo >= 0
      and gramaje_g is null and paquetes_por_caja is null and precio_paquete is null
    )
  ),
  constraint productos_stock_minimo_no_negativo check (stock_minimo >= 0),
  constraint productos_precio_caja_no_negativo check (precio_caja is null or precio_caja >= 0)
);

create index if not exists productos_activo_idx on public.productos (activo);
create index if not exists productos_tipo_idx on public.productos (tipo);

-- ----------------------------------------------------------------------------
-- ventas: cabecera. clave_idempotencia evita duplicar por doble toque.
-- ----------------------------------------------------------------------------
create table if not exists public.ventas (
  id                  uuid primary key default gen_random_uuid(),
  fecha               timestamptz not null default now(),
  total               bigint not null default 0,
  anulada             boolean not null default false,
  anulada_en          timestamptz,
  usuario_id          uuid references public.perfiles (id),
  clave_idempotencia  uuid not null unique
);

create index if not exists ventas_fecha_idx on public.ventas (fecha);
create index if not exists ventas_usuario_idx on public.ventas (usuario_id);

-- ----------------------------------------------------------------------------
-- venta_items: un renglón por producto vendido. Guarda el precio del momento.
--   precio_unitario es por paquete, por caja o por kilo según la unidad.
-- ----------------------------------------------------------------------------
create table if not exists public.venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references public.ventas (id) on delete cascade,
  producto_id     uuid not null references public.productos (id),
  unidad          text not null check (unidad in ('paquete', 'caja', 'gramo')),
  cantidad        integer not null,   -- paquetes, cajas o gramos digitados
  cantidad_base   integer not null,   -- en unidad base (paquetes o gramos)
  precio_unitario bigint not null,    -- por paquete, caja o kilo
  subtotal        bigint not null
);

create index if not exists venta_items_venta_idx on public.venta_items (venta_id);
create index if not exists venta_items_producto_idx on public.venta_items (producto_id);

-- ----------------------------------------------------------------------------
-- movimientos: todo cambio de inventario queda registrado (auditoría).
-- ----------------------------------------------------------------------------
create table if not exists public.movimientos (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references public.productos (id),
  tipo          text not null check (tipo in ('entrada', 'venta', 'anulacion', 'ajuste')),
  cantidad_base integer not null,   -- con signo: + entra, - sale
  motivo        text,               -- ajuste: conteo, merma, dano, otro
  venta_id      uuid references public.ventas (id),
  nota          text,
  usuario_id    uuid references public.perfiles (id),
  fecha         timestamptz not null default now()
);

create index if not exists movimientos_producto_idx on public.movimientos (producto_id);
create index if not exists movimientos_fecha_idx on public.movimientos (fecha);
create index if not exists movimientos_venta_idx on public.movimientos (venta_id);
