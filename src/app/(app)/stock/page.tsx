"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import { cargarProductos } from "@/lib/productos-cliente";
import { agruparPorSabor } from "@/lib/agrupar";
import type { Producto } from "@/lib/tipos";
import { formatCOP } from "@/lib/dinero";
import { GridSabores } from "@/components/grid-sabores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function StockPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [saborSel, setSaborSel] = useState<string | null>(null);
  const [sel, setSel] = useState<Producto | null>(null);

  const recargar = () =>
    cargarProductos().then(setProductos).catch(() => {});

  useRefrescar(() => {
    recargar();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setEsAdmin(data?.rol === "admin"));
    });
  });

  const grupos = useMemo(() => agruparPorSabor(productos), [productos]);
  const presentaciones = useMemo(
    () => grupos.find((g) => g.sabor === saborSel)?.items ?? [],
    [grupos, saborSel],
  );

  // ---- Editor de un producto ----
  if (sel) {
    return (
      <EditorStock
        producto={sel}
        esAdmin={esAdmin}
        onListo={() => {
          setSel(null);
          recargar();
        }}
        onCancelar={() => setSel(null)}
      />
    );
  }

  // ---- Presentaciones del sabor elegido ----
  if (saborSel) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSaborSel(null)}
          className="text-lg font-semibold text-primary underline"
        >
          ← Elegir otro sabor
        </button>
        <h1 className="text-2xl font-extrabold">{saborSel}</h1>
        <p className="text-lg text-muted-foreground">
          {esAdmin
            ? "Toca una presentación para cargar paquetes y precios."
            : "Cantidades y precios."}
        </p>

        <ul className="space-y-2">
          {presentaciones.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSel(p)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border-2 bg-card p-4 text-left transition-[transform,border-color] duration-150 ease-out-strong hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-tight">
                    {p.gramaje_g} g
                  </p>
                  <p className="text-base text-muted-foreground">
                    Venta: {formatCOP(p.precio_paquete ?? 0)}
                    {p.precio_costo != null &&
                      ` · Costo: ${formatCOP(p.precio_costo)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tabular-nums">
                    {p.stock_base}
                  </p>
                  <p className="text-base text-muted-foreground">paquetes</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---- Sabores ----
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Stock</h1>
        <p className="text-lg text-muted-foreground">
          Elige el sabor para ver sus presentaciones.
        </p>
      </div>
      <GridSabores grupos={grupos} onSelect={setSaborSel} />
    </div>
  );
}

function EditorStock({
  producto,
  esAdmin,
  onListo,
  onCancelar,
}: {
  producto: Producto;
  esAdmin: boolean;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [cantidad, setCantidad] = useState(String(producto.stock_base));
  const [final, setFinal] = useState(String(producto.precio_paquete ?? 0));
  const [empresa, setEmpresa] = useState(
    producto.precio_costo != null ? String(producto.precio_costo) : "",
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const num = (s: string) => {
    const n = parseInt(s.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const supabase = createClient();

      const { error: e1 } = await supabase
        .from("productos")
        .update({
          precio_paquete: num(final),
          precio_costo: empresa.trim() === "" ? null : num(empresa),
        })
        .eq("id", producto.id);
      if (e1) throw e1;

      const nuevo = num(cantidad);
      if (nuevo !== producto.stock_base) {
        const { error: e2 } = await supabase.rpc("ajustar_inventario", {
          p_producto: producto.id,
          p_nuevo_stock: nuevo,
          p_motivo: "conteo",
          p_nota: "Ajuste desde Stock",
        });
        if (e2) throw e2;
      }

      setOk(true);
    } catch {
      setError(
        "No se pudo guardar. Revisa que hayas entrado como administrador y el internet.",
      );
    } finally {
      setGuardando(false);
    }
  };

  if (ok) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-2xl font-extrabold text-ok">✔ Guardado</p>
        <p className="text-xl font-bold">{producto.nombre}</p>
        <Button size="lg" className="w-full" onClick={onListo}>
          Seguir con otra presentación
        </Button>
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
        ← Volver a las presentaciones
      </button>

      <h1 className="text-2xl font-extrabold">{producto.nombre}</h1>

      {!esAdmin && (
        <p className="rounded-lg bg-warn/10 px-4 py-3 text-lg font-semibold text-warn">
          Solo el administrador puede cambiar el stock y los precios.
        </p>
      )}

      <div className="space-y-2">
        <Label>¿Cuántos paquetes hay?</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={cantidad}
          disabled={!esAdmin}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Valor del producto final (precio de venta)</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={final}
          disabled={!esAdmin}
          onChange={(e) => setFinal(e.target.value)}
        />
        <p className="text-base text-muted-foreground">
          {formatCOP(num(final))} — es lo que se cobra al vender.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Valor de la empresa (costo, opcional)</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={empresa}
          disabled={!esAdmin}
          onChange={(e) => setEmpresa(e.target.value)}
        />
        <p className="text-base text-muted-foreground">
          Solo de referencia. No se usa al vender.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-lg font-semibold text-destructive">
          {error}
        </p>
      )}

      {esAdmin && (
        <Button
          size="lg"
          className="w-full"
          onClick={guardar}
          disabled={guardando}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      )}
    </div>
  );
}
