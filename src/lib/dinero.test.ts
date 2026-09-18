import { describe, it, expect } from "vitest";
import { formatCOP, redondear50 } from "./dinero";

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
