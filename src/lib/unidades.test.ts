import { describe, it, expect } from "vitest";
import {
  formatGramos,
  formatKgDecimal,
  mostrarEmpacado,
  mostrarGranel,
  valorPorPeso,
  gramosPorPlata,
  precioLibra,
  precioCajaEmpacado,
  precioCajaGranel,
  estadoInventario,
  entradaEmpacadoABase,
  entradaGranelABase,
} from "./unidades";
import type { Producto } from "./tipos";

describe("formatGramos (kg y g, sin decimales)", () => {
  it("formatea los casos base", () => {
    expect(formatGramos(53500)).toBe("53 kg 500 g");
    expect(formatGramos(3500)).toBe("3 kg 500 g");
    expect(formatGramos(500)).toBe("500 g");
    expect(formatGramos(25000)).toBe("25 kg");
    expect(formatGramos(0)).toBe("0 g");
  });

  it("maneja negativos (stock por revisar)", () => {
    expect(formatGramos(-3500)).toBe("-3 kg 500 g");
  });
});

describe("formatKgDecimal (equivalencia de balanza)", () => {
  it("muestra kilos con coma", () => {
    expect(formatKgDecimal(320)).toBe("0,320");
    expect(formatKgDecimal(1500)).toBe("1,500");
  });
});

describe("mostrarEmpacado", () => {
  it("ejemplo regla 3: 82 paquetes, 24 por caja, 250 g", () => {
    // 82 = 3 cajas (72) y 10 paquetes
    const r = mostrarEmpacado(82, 24, 250);
    expect(r.principal).toBe("3 cajas y 10 paquetes");
    expect(r.detalle).toBe("82 paquetes · 20 kg 500 g");
  });

  it("singular y solo cajas", () => {
    expect(mostrarEmpacado(24, 24, 250).principal).toBe("1 caja");
    expect(mostrarEmpacado(1, 24, 250).principal).toBe("1 paquete");
    expect(mostrarEmpacado(0, 24, 250).principal).toBe("0 paquetes");
  });

  it("sin cajas (paquetes_por_caja = 1): solo paquetes (fábrica de achiras)", () => {
    // 12 paquetes de 500 g = 6 kg
    const r = mostrarEmpacado(12, 1, 500);
    expect(r.principal).toBe("12 paquetes");
    expect(r.detalle).toBe("6 kg");
    expect(mostrarEmpacado(1, 1, 100).principal).toBe("1 paquete");
  });
});

describe("mostrarGranel", () => {
  it("ejemplo regla 3: 53.500 g en bultos de 25.000 g", () => {
    const r = mostrarGranel(53500, 25000);
    expect(r.principal).toBe("53 kg 500 g");
    expect(r.detalle).toBe("2 bultos de 25 kg y 3 kg 500 g");
  });

  it("un solo bulto exacto", () => {
    expect(mostrarGranel(25000, 25000).detalle).toBe("1 bulto de 25 kg");
  });

  it("menos de un bulto", () => {
    expect(mostrarGranel(500, 25000).detalle).toBe("500 g");
  });
});

describe("valorPorPeso (por peso, redondeo $50)", () => {
  it("ejemplo regla 6: 320 g a $18.000/kilo -> $5.750", () => {
    expect(valorPorPeso(320, 18000)).toBe(5750);
  });

  it("libra a $18.000/kilo = $9.000", () => {
    expect(valorPorPeso(500, 18000)).toBe(9000);
    expect(valorPorPeso(1000, 18000)).toBe(18000);
  });
});

describe("gramosPorPlata (por plata)", () => {
  it("ejemplo regla 6: $2.000 a $18.000/kilo -> 111 g", () => {
    expect(gramosPorPlata(2000, 18000)).toBe(111);
  });

  it("$9.000 -> 500 g", () => {
    expect(gramosPorPlata(9000, 18000)).toBe(500);
  });
});

describe("precioLibra", () => {
  it("mitad del kilo", () => {
    expect(precioLibra(18000)).toBe(9000);
  });
});

const empacado: Producto = {
  id: "1",
  nombre: "Maní salado 250 g",
  tipo: "empacado",
  gramaje_g: 250,
  paquetes_por_caja: 24,
  precio_paquete: 3000,
  gramos_por_caja: null,
  precio_kilo: null,
  precio_caja: null,
  precio_costo: null,
  stock_base: 82,
  stock_minimo: 12,
  foto_url: null,
  activo: true,
  creado_en: "",
};

const granel: Producto = {
  id: "2",
  nombre: "Maní a granel",
  tipo: "granel",
  gramaje_g: null,
  paquetes_por_caja: null,
  precio_paquete: null,
  gramos_por_caja: 25000,
  precio_kilo: 18000,
  precio_caja: null,
  precio_costo: null,
  stock_base: 53500,
  stock_minimo: 5000,
  foto_url: null,
  activo: true,
  creado_en: "",
};

describe("precios de caja efectivos", () => {
  it("empacado: paquetes_por_caja × precio_paquete cuando precio_caja está vacío", () => {
    expect(precioCajaEmpacado(empacado)).toBe(24 * 3000);
  });

  it("empacado: usa precio_caja cuando está fijado", () => {
    expect(precioCajaEmpacado({ ...empacado, precio_caja: 70000 })).toBe(70000);
  });

  it("granel: gramos_por_caja/1000 × precio_kilo cuando precio_caja está vacío", () => {
    expect(precioCajaGranel(granel)).toBe(450000); // 25 kg × 18.000
  });
});

describe("estadoInventario (semáforo)", () => {
  it("suficiente / queda poco / se acabó", () => {
    expect(estadoInventario(82, 12)).toBe("suficiente");
    expect(estadoInventario(12, 12)).toBe("queda_poco");
    expect(estadoInventario(5, 12)).toBe("queda_poco");
    expect(estadoInventario(0, 12)).toBe("se_acabo");
    expect(estadoInventario(-3, 12)).toBe("se_acabo");
  });
});

describe("conversión de llegada a unidad base", () => {
  it("empacado: cajas y paquetes sueltos -> paquetes", () => {
    expect(entradaEmpacadoABase(3, 10, 24)).toBe(82);
  });

  it("granel: bultos y gramos sueltos -> gramos", () => {
    expect(entradaGranelABase(2, 3500, 25000)).toBe(53500);
  });
});
