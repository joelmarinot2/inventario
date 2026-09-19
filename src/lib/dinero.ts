// Dinero en pesos colombianos, SIEMPRE enteros y sin decimales.

/**
 * Redondea al múltiplo de $50 más cercano (medio hacia arriba).
 * Ej.: 5760 -> 5750, 5775 -> 5800.
 */
export function redondear50(valor: number): number {
  return Math.round(valor / 50) * 50;
}

/**
 * Sugerencias de "con cuánto paga" en efectivo: billetes/redondeos por encima
 * del total, para calcular el vuelto rápido. Ej.: 46.000 -> [50.000, 100.000].
 */
export function sugerenciasEfectivo(total: number): number[] {
  if (total <= 0) return [];
  const billetes = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
  const set = new Set<number>();
  for (const b of billetes) if (b >= total) set.add(b);
  for (const paso of [5000, 10000, 50000, 100000]) {
    const arriba = Math.ceil(total / paso) * paso;
    if (arriba > total) set.add(arriba);
  }
  return Array.from(set)
    .filter((v) => v > total)
    .sort((a, b) => a - b)
    .slice(0, 4);
}

/**
 * Formatea un valor en pesos colombianos: "$ 12.500".
 * Redondea a entero y agrupa miles con punto. Sin decimales.
 */
export function formatCOP(valor: number): string {
  const entero = Math.round(valor);
  const negativo = entero < 0;
  const abs = Math.abs(entero).toString();
  // Agrupar de a 3 desde la derecha con punto.
  const conPuntos = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negativo ? "-" : ""}$ ${conPuntos}`;
}
