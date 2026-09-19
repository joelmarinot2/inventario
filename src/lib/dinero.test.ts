import { describe, it, expect } from "vitest";
import { formatCOP, redondear50, sugerenciasEfectivo } from "./dinero";

describe("redondear50", () => {
  it("redondea al múltiplo de $50 más cercano (ejemplo regla 6: 5760 -> 5750)", () => {
    expect(redondear50(5760)).toBe(5750);
  });

  it("redondea hacia arriba en el punto medio", () => {
    expect(redondear50(5775)).toBe(5800);
    expect(redondear50(25)).toBe(50);
  });

  it("deja intactos los múltiplos exactos", () => {
    expect(redondear50(5750)).toBe(5750);
    expect(redondear50(0)).toBe(0);
  });
});

describe("formatCOP", () => {
  it("formatea con separador de miles y sin decimales", () => {
    expect(formatCOP(12500)).toBe("$ 12.500");
    expect(formatCOP(5750)).toBe("$ 5.750");
    expect(formatCOP(0)).toBe("$ 0");
    expect(formatCOP(1000000)).toBe("$ 1.000.000");
  });

  it("redondea a entero", () => {
    expect(formatCOP(5750.4)).toBe("$ 5.750");
  });

  it("maneja negativos (inventario/ajustes)", () => {
    expect(formatCOP(-2000)).toBe("-$ 2.000");
  });
});

describe("sugerenciasEfectivo (atajos de billetes)", () => {
  it("ejemplo: 46.000 -> pagar con 50.000 o 100.000", () => {
    expect(sugerenciasEfectivo(46000)).toEqual([50000, 100000]);
  });

  it("16.000 -> 20.000, 50.000, 100.000", () => {
    expect(sugerenciasEfectivo(16000)).toEqual([20000, 50000, 100000]);
  });

  it("montos pequeños y borde", () => {
    expect(sugerenciasEfectivo(0)).toEqual([]);
    expect(sugerenciasEfectivo(3500)).toEqual([5000, 10000, 20000, 50000]);
  });
});
