"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import { cargarProductos } from "@/lib/productos-cliente";
import type { Producto } from "@/lib/tipos";
import {
  entradaEmpacadoABase,
  entradaGranelABase,
  formatGramos,
  mostrarCantidad,
} from "@/lib/unidades";
import { GridProductos } from "@/components/grid-productos";
import { PasoCantidad } from "@/components/paso-cantidad";
import { TecladoNumerico } from "@/components/teclado-numerico";
import { Button } from "@/components/ui/button";

const es = new Intl.NumberFormat("es-CO");

export default function LlegoMercanciaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sel, setSel] = useState<Producto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useRefrescar(() => {
    cargarProductos()
      .then(setProductos)
      .catch(() => setError("No se pudieron cargar los productos."));
  });

  if (sel) {
    return (
      <EntradaProducto
        producto={sel}
        onListo={() => {
          setSel(null);
          cargarProductos().then(setProductos).catch(() => {});
        }}
        onCancelar={() => setSel(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Llegó mercancía</h1>
        <p className="text-lg text-muted-foreground">
          Toca el producto que llegó.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-lg font-semibold text-destructive">
          {error}
        </p>
      )}
      <GridProductos productos={productos} onSelect={setSel} />
    </div>
  );
}

function EntradaProducto({
  producto,
  onListo,
  onCancelar,
}: {
  producto: Producto;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [cajas, setCajas] = useState(0);
  const [sueltos, setSueltos] = useState(0); // paquetes sueltos (empacado)
  const [gramos, setGramos] = useState(""); // gramos sueltos (granel)
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    antes: number;
    ahora: number;
  } | null>(null);

  const esEmpacado = producto.tipo === "empacado";
  const gramosNum = parseInt(gramos || "0", 10);

  const base = esEmpacado
    ? entradaEmpacadoABase(cajas, sueltos, producto.paquetes_por_caja ?? 1)
    : entradaGranelABase(cajas, gramosNum, producto.gramos_por_caja ?? 1);

  const guardar = async () => {
    if (base <= 0) {
      setError("Escribe cuánto llegó.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: e } = await supabase.rpc("registrar_entrada", {
        p_producto: producto.id,
        p_cantidad_base: base,
      });
      if (e) throw e;
      const r = data as { stock_anterior: number; stock_nuevo: number };
      setResultado({ antes: r.stock_anterior, ahora: r.stock_nuevo });
    } catch {
      setError("No se pudo guardar. Revisa el internet e intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  if (resultado) {
    const antes = mostrarCantidad({ ...producto, stock_base: resultado.antes });
    const ahora = mostrarCantidad({ ...producto, stock_base: resultado.ahora });
    return (
      <div className="space-y-6 text-center">
        <div className="rounded-xl border-2 border-ok bg-ok/10 p-6">
          <p className="text-2xl font-extrabold text-ok">✔ Mercancía guardada</p>
          <p className="mt-2 text-xl font-bold">{producto.nombre}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-lg bg-background p-3">
              <p className="text-base text-muted-foreground">Había</p>
              <p className="text-xl font-bold">{antes.principal}</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-base text-muted-foreground">Ahora hay</p>
              <p className="text-xl font-bold text-ok">{ahora.principal}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="flex-1" onClick={onListo}>
            Registrar otro producto
          </Button>
          <Button asChild size="lg" variant="outline" className="flex-1">
            <Link href="/">Ir a Inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onCancelar}
        className="text-lg font-semibold text-primary underline"
      >
        ← Elegir otro producto
      </button>

      <h1 className="text-2xl font-extrabold">{producto.nombre}</h1>

      {esEmpacado ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xl font-bold">¿Cuántas cajas llegaron?</p>
            <PasoCantidad value={cajas} onChange={setCajas} sufijo="cajas" />
            <p className="text-center text-base text-muted-foreground">
              Cada caja trae {producto.paquetes_por_caja} paquetes
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold">¿Y cuántos paquetes sueltos?</p>
            <PasoCantidad
              value={sueltos}
              onChange={setSueltos}
              max={(producto.paquetes_por_caja ?? 1) - 1 || 999}
              sufijo="paquetes"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xl font-bold">¿Cuántos bultos o cajas llegaron?</p>
            <PasoCantidad value={cajas} onChange={setCajas} sufijo="bultos" />
            <p className="text-center text-base text-muted-foreground">
              Cada bulto trae {formatGramos(producto.gramos_por_caja ?? 0)}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-xl font-bold">¿Y cuántos gramos sueltos?</p>
            <div className="rounded-xl border-2 bg-muted p-4 text-center">
              <p className="text-3xl font-extrabold tabular-nums">
                {es.format(gramosNum)} g
              </p>
              <p className="text-lg text-muted-foreground">
                = {formatGramos(gramosNum)}
              </p>
            </div>
            <TecladoNumerico value={gramos} onChange={setGramos} maxLen={7} />
          </div>
        </div>
      )}

      <div className="rounded-xl border-2 bg-card p-4 text-center">
        <p className="text-lg text-muted-foreground">Se va a sumar</p>
        <p className="text-2xl font-extrabold">
          {esEmpacado
            ? `${es.format(base)} paquetes`
            : `${es.format(base)} g = ${formatGramos(base)}`}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-lg font-semibold text-destructive">
          {error}
        </p>
      )}

      <Button
        size="lg"
        variant="ok"
        className="w-full"
        onClick={guardar}
        disabled={guardando || base <= 0}
      >
        {guardando ? "Guardando…" : "GUARDAR"}
      </Button>
    </div>
  );
}
