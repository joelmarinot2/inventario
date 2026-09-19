"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import { cargarProductos } from "@/lib/productos-cliente";
import { agruparPorSabor } from "@/lib/agrupar";
import type { ItemCarrito, ItemVentaEntrada, Producto } from "@/lib/tipos";
import { formatCOP } from "@/lib/dinero";
import { estadoInventario, mostrarCantidad } from "@/lib/unidades";
import { GridSabores } from "@/components/grid-sabores";
import { BadgeEstado } from "@/components/badge-estado";
import { ConfigurarEmpacado } from "@/components/vender/configurar-empacado";
import { ConfigurarGranel } from "@/components/vender/configurar-granel";
import { Button } from "@/components/ui/button";

type Vista = "sabores" | "presentaciones" | "config" | "resumen" | "guardada";

export default function VenderPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [vista, setVista] = useState<Vista>("sabores");
  const [saborActual, setSaborActual] = useState<string | null>(null);
  const [actual, setActual] = useState<Producto | null>(null);
  const [clave, setClave] = useState<string>(() => crypto.randomUUID());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ventaGuardada, setVentaGuardada] = useState<{
    id: string;
    total: number;
  } | null>(null);

  useRefrescar(() => {
    cargarProductos().then(setProductos).catch(() => {});
  });

  const grupos = useMemo(() => agruparPorSabor(productos), [productos]);
  const presentaciones = useMemo(
    () => grupos.find((g) => g.sabor === saborActual)?.items ?? [],
    [grupos, saborActual],
  );

  const total = useMemo(
    () => carrito.reduce((s, it) => s + it.subtotal, 0),
    [carrito],
  );

  const stockDisponible = (p: Producto) =>
    p.stock_base -
    carrito
      .filter((it) => it.producto.id === p.id)
      .reduce((s, it) => s + it.cantidad_base, 0);

  const agregar = (item: ItemCarrito) => {
    setCarrito((c) => [...c, item]);
    setActual(null);
    setVista("resumen");
  };

  const quitar = (claveItem: string) =>
    setCarrito((c) => c.filter((it) => it.clave !== claveItem));

  const guardarVenta = async () => {
    if (carrito.length === 0) return;
    setGuardando(true);
    setError(null);
    const items: ItemVentaEntrada[] = carrito.map((it) => ({
      producto_id: it.producto.id,
      unidad: it.unidad,
      modo: it.modo,
      cantidad: it.cantidad,
      valor_objetivo: it.valor_objetivo,
    }));
    try {
      const supabase = createClient();
      const { data, error: e } = await supabase.rpc("registrar_venta", {
        p_clave: clave,
        p_items: items,
      });
      if (e) throw e;
      const r = data as { venta_id: string; total: number };
      setVentaGuardada({ id: r.venta_id, total: Number(r.total) });
      setVista("guardada");
      cargarProductos().then(setProductos).catch(() => {});
    } catch {
      setError("No se pudo guardar la venta. Revisa el internet e intenta otra vez.");
    } finally {
      setGuardando(false);
    }
  };

  const nuevaVenta = () => {
    setCarrito([]);
    setClave(crypto.randomUUID());
    setVentaGuardada(null);
    setError(null);
    setSaborActual(null);
    setVista("sabores");
  };

  // ---- Venta guardada ----
  if (vista === "guardada" && ventaGuardada) {
    return (
      <VentaGuardada
        total={ventaGuardada.total}
        ventaId={ventaGuardada.id}
        onNueva={nuevaVenta}
      />
    );
  }

  // ---- Configurar producto (cantidad) ----
  if (vista === "config" && actual) {
    const props = {
      producto: actual,
      stockDisponible: stockDisponible(actual),
      onAgregar: agregar,
      onCancelar: () => {
        setActual(null);
        setVista("presentaciones");
      },
    };
    return actual.tipo === "empacado" ? (
      <ConfigurarEmpacado {...props} />
    ) : (
      <ConfigurarGranel {...props} />
    );
  }

  // ---- Resumen ----
  if (vista === "resumen") {
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-extrabold">Resumen de la venta</h1>

        {carrito.length === 0 ? (
          <p className="text-lg text-muted-foreground">
            No has agregado productos todavía.
          </p>
        ) : (
          <ul className="space-y-3">
            {carrito.map((it) => (
              <li
                key={it.clave}
                className="flex items-center gap-3 rounded-xl border-2 bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold leading-tight">
                    {it.producto.nombre}
                  </p>
                  <p className="text-lg text-muted-foreground">{it.etiqueta}</p>
                </div>
                <p className="text-2xl font-extrabold tabular-nums">
                  {formatCOP(it.subtotal)}
                </p>
                <button
                  type="button"
                  onClick={() => quitar(it.clave)}
                  aria-label={`Quitar ${it.producto.nombre}`}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
                >
                  <Trash2 className="h-6 w-6 text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-xl border-2 bg-card p-5 text-center">
          <p className="text-xl font-semibold text-muted-foreground">TOTAL</p>
          <p className="text-4xl font-extrabold tabular-nums">
            {formatCOP(total)}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-lg font-semibold text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setSaborActual(null);
              setVista("sabores");
            }}
          >
            Agregar otro producto
          </Button>
          <Button
            variant="ok"
            size="lg"
            onClick={guardarVenta}
            disabled={guardando || carrito.length === 0}
          >
            {guardando ? "Guardando…" : "GUARDAR VENTA"}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Presentaciones del sabor elegido ----
  if (vista === "presentaciones" && saborActual) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => {
            setSaborActual(null);
            setVista("sabores");
          }}
          className="text-lg font-semibold text-primary underline"
        >
          ← Elegir otro sabor
        </button>

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{saborActual}</h1>
          {carrito.length > 0 && (
            <Button size="sm" onClick={() => setVista("resumen")}>
              Ver venta ({carrito.length})
            </Button>
          )}
        </div>
        <p className="text-lg text-muted-foreground">Elige la presentación:</p>

        <div className="grid grid-cols-2 gap-4">
          {presentaciones.map((p) => {
            const estado = estadoInventario(p.stock_base, p.stock_minimo);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActual(p);
                  setVista("config");
                }}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-input bg-card p-4 text-center transition-[transform,border-color] duration-150 ease-out-strong hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.97]"
              >
                <p className="text-3xl font-extrabold">{p.gramaje_g} g</p>
                <p className="text-xl font-extrabold text-primary">
                  {formatCOP(p.precio_paquete ?? 0)}
                </p>
                <BadgeEstado estado={estado} />
                <p className="text-base text-muted-foreground">
                  {mostrarCantidad(p).principal}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- Sabores (inicio de la venta) ----
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Vender</h1>
        {carrito.length > 0 && (
          <Button size="sm" onClick={() => setVista("resumen")}>
            Ver venta ({carrito.length}) · {formatCOP(total)}
          </Button>
        )}
      </div>
      <p className="text-lg text-muted-foreground">Elige el sabor:</p>
      <GridSabores
        grupos={grupos}
        onSelect={(s) => {
          setSaborActual(s);
          setVista("presentaciones");
        }}
      />
    </div>
  );
}

function VentaGuardada({
  total,
  ventaId,
  onNueva,
}: {
  total: number;
  ventaId: string;
  onNueva: () => void;
}) {
  const [deshaciendo, setDeshaciendo] = useState(false);
  const [anulada, setAnulada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deshacer = async () => {
    setDeshaciendo(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: e } = await supabase.rpc("anular_venta", {
        p_venta: ventaId,
      });
      if (e) throw e;
      setAnulada(true);
    } catch {
      setError("No se pudo deshacer. Intenta de nuevo.");
    } finally {
      setDeshaciendo(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div
        className={`rounded-xl border-2 p-8 ${
          anulada ? "border-warn bg-warn/10" : "border-ok bg-ok/10"
        }`}
      >
        {anulada ? (
          <p className="text-2xl font-extrabold text-warn">
            Venta deshecha. El inventario volvió a su lugar.
          </p>
        ) : (
          <>
            <p className="text-2xl font-extrabold text-ok">✔ Venta guardada</p>
            <p className="mt-3 text-5xl font-extrabold tabular-nums">
              {formatCOP(total)}
            </p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-lg font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {!anulada && (
          <Button
            variant="outline"
            size="lg"
            onClick={deshacer}
            disabled={deshaciendo}
          >
            {deshaciendo ? "Deshaciendo…" : "Deshacer esta venta"}
          </Button>
        )}
        <Button size="lg" onClick={onNueva}>
          Nueva venta
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/">Ir a Inicio</Link>
        </Button>
      </div>
    </div>
  );
}
