import { describe, it, expect } from "vitest";
import {
  saborDe,
  etiquetaPresentacion,
  agruparPorSabor,
  agruparPorGramaje,
} from "./agrupar";
import type { Producto } from "./tipos";

function prod(
  nombre: string,
  gramaje: number,
  presentacion: "tarro" | "bolsa" | null,
  stock = 0,
): Producto {
  return {
    id: `${nombre}`,
    nombre,
    tipo: "empacado",
    gramaje_g: gramaje,
    paquetes_por_caja: 1,
    precio_paquete: 0,
    gramos_por_caja: null,
    precio_kilo: null,
    precio_caja: null,
    precio_costo: null,
    presentacion,
    stock_base: stock,
    stock_minimo: 0,
    foto_url: null,
    activo: true,
    creado_en: "",
  };
}

describe("saborDe", () => {
  it("quita gramaje y presentación", () => {
    expect(saborDe("Achiras con chocolate 250 g tarro")).toBe("Achiras con chocolate");
    expect(saborDe("Achiras picantes 500 g bolsa")).toBe("Achiras picantes");
    expect(saborDe("Achiras tradicionales 100 g")).toBe("Achiras tradicionales");
  });

  it("no confunde la 'g' de 'gourmet' con la unidad", () => {
    expect(saborDe("Achiras gourmet 100 g tarro")).toBe("Achiras gourmet");
  });
});

describe("etiquetaPresentacion", () => {
  it("Tarro / Bolsa / vacío", () => {
    expect(etiquetaPresentacion(prod("x 100 g tarro", 100, "tarro"))).toBe("Tarro");
    expect(etiquetaPresentacion(prod("x 100 g bolsa", 100, "bolsa"))).toBe("Bolsa");
    expect(etiquetaPresentacion(prod("x 100 g", 100, null))).toBe("");
  });
});

describe("agruparPorSabor + agruparPorGramaje", () => {
  const productos = [
    prod("Achiras picantes 500 g bolsa", 500, "bolsa", 3),
    prod("Achiras gourmet 100 g tarro", 100, "tarro", 10),
    prod("Achiras gourmet 100 g bolsa", 100, "bolsa", 7),
    prod("Achiras gourmet 250 g tarro", 250, "tarro", 1),
    prod("Achiras picantes 500 g tarro", 500, "tarro", 2),
  ];

  it("agrupa por sabor ordenado alfabéticamente", () => {
    const g = agruparPorSabor(productos);
    expect(g.map((x) => x.sabor)).toEqual(["Achiras gourmet", "Achiras picantes"]);
    expect(g[0].items).toHaveLength(3);
    expect(g[1].items).toHaveLength(2);
  });

  it("dentro del sabor agrupa por gramaje, tarro antes que bolsa", () => {
    const gourmet = agruparPorSabor(productos)[0].items;
    const porGramaje = agruparPorGramaje(gourmet);
    expect(porGramaje.map((x) => x.gramaje)).toEqual([100, 250]);
    expect(porGramaje[0].items.map((p) => p.presentacion)).toEqual(["tarro", "bolsa"]);
    // total de unidades del gramaje 100 = tarro 10 + bolsa 7
    expect(porGramaje[0].items.reduce((s, p) => s + p.stock_base, 0)).toBe(17);
  });
});
