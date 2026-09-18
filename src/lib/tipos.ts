// Tipos del dominio. El inventario SIEMPRE se guarda en la unidad base y como
// número entero: paquetes para empacado, gramos para granel. Nada de decimales.

export type Rol = "admin" | "vendedor";

export type TipoProducto = "empacado" | "granel";

export type UnidadVenta = "paquete" | "caja" | "gramo";

export type ModoGranel = "peso" | "plata" | "caja";

export type TipoMovimiento = "entrada" | "venta" | "anulacion" | "ajuste";

export type MotivoAjuste = "conteo" | "merma" | "dano" | "otro";

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
  creado_en: string;
}

export interface Producto {
  id: string;
  nombre: string;
  tipo: TipoProducto;

  // Empacado
  gramaje_g: number | null;
  paquetes_por_caja: number | null;
  precio_paquete: number | null;

  // Granel
  gramos_por_caja: number | null;
  precio_kilo: number | null;

  // Común
  precio_caja: number | null; // opcional; vacío = se calcula
  stock_base: number; // entero en unidad base (puede ser negativo)
  stock_minimo: number; // entero en unidad base
  foto_url: string | null;
  activo: boolean;
  creado_en: string;
}

export interface Venta {
  id: string;
  fecha: string;
  total: number;
  anulada: boolean;
  anulada_en: string | null;
  usuario_id: string;
  clave_idempotencia: string;
}

export interface VentaItem {
  id: string;
  venta_id: string;
  producto_id: string;
  unidad: UnidadVenta;
  cantidad: number;
  cantidad_base: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Movimiento {
  id: string;
  producto_id: string;
  tipo: TipoMovimiento;
  cantidad_base: number; // con signo
  motivo: string | null;
  venta_id: string | null;
  nota: string | null;
  usuario_id: string | null;
  fecha: string;
}

// Ítem que se envía a la RPC registrar_venta. El servidor recalcula
// cantidad_base, precio_unitario y subtotal; nunca confía en el cliente.
export interface ItemVentaEntrada {
  producto_id: string;
  unidad: UnidadVenta;
  modo?: ModoGranel; // solo granel
  cantidad: number; // paquetes, cajas, o gramos (modo peso)
  valor_objetivo?: number; // solo granel modo 'plata' (la plata digitada)
}

// Ítem en el carrito, ya con lo necesario para mostrar y para enviar.
export interface ItemCarrito {
  clave: string; // único en el carrito
  producto: Producto;
  unidad: UnidadVenta;
  modo?: ModoGranel;
  cantidad: number;
  valor_objetivo?: number;
  // Precalculado para mostrar (el servidor manda al guardar).
  cantidad_base: number;
  subtotal: number;
  etiqueta: string; // "2 cajas", "320 g", "1 libra", ...
}

export type EstadoInventario = "suficiente" | "queda_poco" | "se_acabo";
