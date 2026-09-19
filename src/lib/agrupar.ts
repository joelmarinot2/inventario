import type { Producto } from "./tipos";

// El "sabor" es el nombre sin la presentación: "Achiras con chocolate 250 g"
// -> "Achiras con chocolate".
export function saborDe(nombre: string): string {
  return nombre.replace(/\s*\d+\s*g\s*$/i, "").trim();
}

export interface GrupoSabor {
  sabor: string;
  items: Producto[]; // presentaciones, ordenadas por gramaje
}

// Agrupa los productos por sabor y ordena las presentaciones por gramaje.
export function agruparPorSabor(productos: Producto[]): GrupoSabor[] {
  const mapa = new Map<string, Producto[]>();
  for (const p of productos) {
    const k = saborDe(p.nombre);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(p);
  }
  const grupos = Array.from(mapa.entries()).map(([sabor, items]) => ({
    sabor,
    items: items.sort((a, b) => (a.gramaje_g ?? 0) - (b.gramaje_g ?? 0)),
  }));
  grupos.sort((a, b) => a.sabor.localeCompare(b.sabor, "es"));
  return grupos;
}
