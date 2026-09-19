// Conversión y presentación de cantidades. Todo entero, nunca coma decimal.
// El inventario base es paquetes (empacado) o gramos (granel).

import { redondear50 } from "./dinero";
import type { EstadoInventario, Producto } from "./tipos";

/* ------------------------------------------------------------------ */
/* Formato de gramos                                                   */
/* ------------------------------------------------------------------ */

/**
 * Formatea gramos enteros como "kg y g", sin decimales.
 * Ej.: 53500 -> "53 kg 500 g", 3500 -> "3 kg 500 g", 500 -> "500 g",
 * 25000 -> "25 kg", 0 -> "0 g". Los negativos llevan signo.
 */
export function formatGramos(g: number): string {
  const negativo = g < 0;
  const abs = Math.abs(Math.trunc(g));
  const kg = Math.floor(abs / 1000);
  const gramos = abs % 1000;
  let texto: string;
  if (kg > 0 && gramos > 0) texto = `${kg} kg ${gramos} g`;
  else if (kg > 0) texto = `${kg} kg`;
  else texto = `${gramos} g`;
  return negativo ? `-${texto}` : texto;
}

/**
 * Equivalencia en kilos con coma decimal, como la muestran algunas balanzas.
 * Ej.: 320 -> "0,320", 1500 -> "1,500". Solo para mostrar mientras se digita.
 */
export function formatKgDecimal(g: number): string {
  return (g / 1000).toFixed(3).replace(".", ",");
}

/* ------------------------------------------------------------------ */
/* Cantidades de inventario para mostrar                               */
/* ------------------------------------------------------------------ */

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

export interface CantidadMostrada {
  principal: string; // grande
  detalle: string; // pequeño, debajo
}

/**
 * Empacado: "3 cajas y 10 paquetes" y debajo "82 paquetes · 20 kg 500 g".
 */
export function mostrarEmpacado(
  stockPaquetes: number,
  paquetesPorCaja: number,
  gramajeG: number,
): CantidadMostrada {
  const negativo = stockPaquetes < 0;
  const abs = Math.abs(stockPaquetes);
  const totalGramos = abs * gramajeG;

  // Sin cajas (paquetes sueltos): se muestra solo en paquetes.
  if (paquetesPorCaja <= 1) {
    const principalSolo = negativo
      ? `-${plural(abs, "paquete", "paquetes")}`
      : plural(abs, "paquete", "paquetes");
    return {
      principal: principalSolo,
      detalle: formatGramos(negativo ? -totalGramos : totalGramos),
    };
  }

  const cajas = Math.floor(abs / paquetesPorCaja);
  const sueltos = abs % paquetesPorCaja;

  let principal: string;
  if (cajas > 0 && sueltos > 0) {
    principal = `${plural(cajas, "caja", "cajas")} y ${plural(sueltos, "paquete", "paquetes")}`;
  } else if (cajas > 0) {
    principal = plural(cajas, "caja", "cajas");
  } else {
    principal = plural(sueltos, "paquete", "paquetes");
  }
  if (negativo) principal = `-${principal}`;

  const detalle = `${plural(abs, "paquete", "paquetes")} · ${formatGramos(negativo ? -totalGramos : totalGramos)}`;

  return { principal, detalle };
}

/**
 * Granel: "53 kg 500 g" y debajo "2 bultos de 25 kg y 3 kg 500 g".
 */
export function mostrarGranel(
  stockGramos: number,
  gramosPorCaja: number,
): CantidadMostrada {
  const principal = formatGramos(stockGramos);

  const negativo = stockGramos < 0;
  const abs = Math.abs(stockGramos);
  const bultos = gramosPorCaja > 0 ? Math.floor(abs / gramosPorCaja) : 0;
  const resto = gramosPorCaja > 0 ? abs % gramosPorCaja : abs;

  let detalle: string;
  if (bultos > 0) {
    detalle = `${plural(bultos, "bulto", "bultos")} de ${formatGramos(gramosPorCaja)}`;
    if (resto > 0) detalle += ` y ${formatGramos(resto)}`;
  } else {
    detalle = formatGramos(resto);
  }
  if (negativo) detalle = `-${detalle}`;

  return { principal, detalle };
}

/**
 * Presenta el stock del producto según su tipo (regla 3).
 */
export function mostrarCantidad(p: Producto): CantidadMostrada {
  if (p.tipo === "empacado") {
    return mostrarEmpacado(
      p.stock_base,
      p.paquetes_por_caja ?? 1,
      p.gramaje_g ?? 0,
    );
  }
  return mostrarGranel(p.stock_base, p.gramos_por_caja ?? 1);
}

/* ------------------------------------------------------------------ */
/* Precios efectivos                                                   */
/* ------------------------------------------------------------------ */

/** Precio por caja del empacado: el fijado, o paquetes_por_caja × precio_paquete. */
export function precioCajaEmpacado(p: Producto): number {
  if (p.precio_caja != null) return p.precio_caja;
  return (p.paquetes_por_caja ?? 0) * (p.precio_paquete ?? 0);
}

/** Precio por caja/bulto completo del granel: el fijado, o gramos_por_caja/1000 × precio_kilo. */
export function precioCajaGranel(p: Producto): number {
  if (p.precio_caja != null) return p.precio_caja;
  return Math.round(((p.gramos_por_caja ?? 0) * (p.precio_kilo ?? 0)) / 1000);
}

/** Precio por libra (500 g) a partir del precio por kilo. */
export function precioLibra(precioKilo: number): number {
  return Math.round(precioKilo / 2);
}

/* ------------------------------------------------------------------ */
/* Cálculos de venta a granel                                          */
/* ------------------------------------------------------------------ */

/**
 * Valor por peso: gramos × precio_kilo ÷ 1000, redondeado al múltiplo de $50.
 * Ej.: 320 g a $18.000/kilo -> 5760 -> $5.750.
 */
export function valorPorPeso(gramos: number, precioKilo: number): number {
  return redondear50((gramos * precioKilo) / 1000);
}

/**
 * "Por plata": cuántos gramos pesar para una plata, redondeado al gramo.
 * Ej.: $2.000 a $18.000/kilo -> 111 g. Se cobra exactamente la plata digitada.
 */
export function gramosPorPlata(valor: number, precioKilo: number): number {
  if (precioKilo <= 0) return 0;
  return Math.round((valor * 1000) / precioKilo);
}

/* ------------------------------------------------------------------ */
/* Semáforo de inventario                                              */
/* ------------------------------------------------------------------ */

export function estadoInventario(
  stockBase: number,
  stockMinimo: number,
): EstadoInventario {
  if (stockBase <= 0) return "se_acabo";
  if (stockBase <= stockMinimo) return "queda_poco";
  return "suficiente";
}

export const TEXTO_ESTADO: Record<EstadoInventario, string> = {
  suficiente: "Hay suficiente",
  queda_poco: "Queda poco",
  se_acabo: "Se acabó",
};

/* ------------------------------------------------------------------ */
/* Conversión de llegada de mercancía a unidad base                    */
/* ------------------------------------------------------------------ */

/** Empacado: cajas + paquetes sueltos -> paquetes (unidad base). */
export function entradaEmpacadoABase(
  cajas: number,
  paquetesSueltos: number,
  paquetesPorCaja: number,
): number {
  return cajas * paquetesPorCaja + paquetesSueltos;
}

/** Granel: bultos + gramos sueltos -> gramos (unidad base). */
export function entradaGranelABase(
  bultos: number,
  gramosSueltos: number,
  gramosPorCaja: number,
): number {
  return bultos * gramosPorCaja + gramosSueltos;
}

/* ------------------------------------------------------------------ */
/* Botones rápidos de granel                                           */
/* ------------------------------------------------------------------ */

export const BOTONES_RAPIDOS_GRANEL: { etiqueta: string; gramos: number }[] = [
  { etiqueta: "¼ libra", gramos: 125 },
  { etiqueta: "½ libra", gramos: 250 },
  { etiqueta: "1 libra", gramos: 500 },
  { etiqueta: "1 kilo", gramos: 1000 },
];
