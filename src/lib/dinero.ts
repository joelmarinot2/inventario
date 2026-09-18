// Dinero en pesos colombianos, SIEMPRE enteros y sin decimales.

/**
 * Redondea al múltiplo de $50 más cercano (medio hacia arriba).
 * Ej.: 5760 -> 5750, 5775 -> 5800.
 */
export function redondear50(valor: number): number {
  return Math.round(valor / 50) * 50;
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
