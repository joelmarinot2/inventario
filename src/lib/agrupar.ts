import type { Producto } from "./tipos";

// El "sabor" es el nombre sin la presentación: "Achiras con chocolate 250 g
// tarro" -> "Achiras con chocolate".
export function saborDe(nombre: string): string {
  return nombre.replace(/\s*\d+\s*g.*$/i, "").trim();
}

// Etiqueta de la presentación tarro/bolsa.
export function etiquetaPresentacion(p: Producto): string {
  if (p.presentacion === "tarro") return "Tarro";
  if (p.presentacion === "bolsa") return "Bolsa";
  return "";
}

export interface GrupoSabor {
  sabor: string;
  items: Producto[]; // todas las presentaciones del sabor
}

// Agrupa los productos por sabor.
export function agruparPorSabor(productos: Producto[]): GrupoSabor[] {
  const mapa = new Map<string, Producto[]>();
  for (const p of productos) {
    const k = saborDe(p.nombre);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(p);
  }
  const grupos = Array.from(mapa.entries()).map(([sabor, items]) => ({
    sabor,
    items,
  }));
  grupos.sort((a, b) => a.sabor.localeCompare(b.sabor, "es"));
  return grupos;
}

export interface GrupoGramaje {
  gramaje: number;
  items: Producto[]; // tarro y bolsa de ese gramaje
}

// Dentro de un sabor, agrupa por gramaje (100/200/250/500) y ordena por él.
export function agruparPorGramaje(items: Producto[]): GrupoGramaje[] {
  const mapa = new Map<number, Producto[]>();
  for (const p of items) {
    const k = p.gramaje_g ?? 0;
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(p);
  }
  const grupos = Array.from(mapa.entries()).map(([gramaje, its]) => ({
    gramaje,
    items: its.sort((a, b) =>
      (a.presentacion ?? "").localeCompare(b.presentacion ?? ""),
    ),
  }));
  grupos.sort((a, b) => a.gramaje - b.gramaje);
  return grupos;
}
