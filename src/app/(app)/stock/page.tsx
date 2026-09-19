"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import { cargarProductos } from "@/lib/productos-cliente";
import {
  agruparPorSabor,
  agruparPorGramaje,
  etiquetaPresentacion,
} from "@/lib/agrupar";
import type { Producto } from "@/lib/tipos";
import { formatCOP } from "@/lib/dinero";
import { GridSabores } from "@/components/grid-sabores";
import { FotoProducto } from "@/components/foto-producto";
import { BotonVolver } from "@/components/boton-volver";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CampoDinero } from "@/components/ui/campo-dinero";

export default function StockPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [saborSel, setSaborSel] = useState<string | null>(null);
  const [gramajeSel, setGramajeSel] = useState<number | null>(null);
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
  const itemsSabor = useMemo(
    () => grupos.find((g) => g.sabor === saborSel)?.items ?? [],
    [grupos, saborSel],
  );
  const gramajes = useMemo(() => agruparPorGramaje(itemsSabor), [itemsSabor]);
  const presentaciones = useMemo(
    () => gramajes.find((g) => g.gramaje === gramajeSel)?.items ?? [],
    [gramajes, gramajeSel],
  );

  // ---- Editor ----
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

  // ---- Presentaciones (tarro/bolsa) ----
  if (saborSel && gramajeSel != null) {
    return (
      <div className="space-y-5">
        <BotonVolver onClick={() => setGramajeSel(null)}>
          Elegir otro gramaje
        </BotonVolver>
        <h1 className="text-2xl font-extrabold">
          {saborSel} · {gramajeSel} g
        </h1>
        <ul className="space-y-2">
          {presentaciones.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSel(p)}
                className="flex w-full items-center gap-3 rounded-xl border-2 bg-card p-4 text-left transition-[transform,border-color] duration-150 ease-out-strong hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.99]"
              >
                <FotoProducto
                  url={p.foto_url}
                  nombre={p.nombre}
                  tipo="empacado"
                  className="h-16 w-16 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold leading-tight">
                    {etiquetaPresentacion(p) || "Presentación"}
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
                  <p className="text-base text-muted-foreground">unidades</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---- Gramajes ----
  if (saborSel) {
    return (
      <div className="space-y-5">
        <BotonVolver onClick={() => setSaborSel(null)}>
          Elegir otro sabor
        </BotonVolver>
        <h1 className="text-2xl font-extrabold">{saborSel}</h1>
        <p className="text-lg text-muted-foreground">Elige el gramaje:</p>
        <div className="grid grid-cols-2 gap-4">
          {gramajes.map((g) => {
            const totalUnidades = g.items.reduce(
              (s, p) => s + p.stock_base,
              0,
            );
            return (
              <button
                key={g.gramaje}
                type="button"
                onClick={() => setGramajeSel(g.gramaje)}
                className="flex flex-col items-center gap-1 rounded-xl border-2 border-input bg-card p-6 text-center transition-[transform,border-color] duration-150 ease-out-strong hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.97]"
              >
                <p className="text-4xl font-extrabold">{g.gramaje} g</p>
                <p className="text-xl font-bold">{totalUnidades} unidades</p>
                <p className="text-base text-muted-foreground">Tarro y bolsa</p>
              </button>
            );
          })}
        </div>
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
      <GridSabores
        grupos={grupos}
        onSelect={(s) => {
          setSaborSel(s);
          setGramajeSel(null);
        }}
      />
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
  const [fotoUrl, setFotoUrl] = useState<string | null>(producto.foto_url);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const num = (s: string) => {
    const n = parseInt(s.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const subirFoto = async (file: File) => {
    setSubiendo(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const ruta = `${crypto.randomUUID()}.${ext}`;
      const { error: e } = await supabase.storage
        .from("fotos-productos")
        .upload(ruta, file, { upsert: true });
      if (e) throw e;
      const { data } = supabase.storage
        .from("fotos-productos")
        .getPublicUrl(ruta);
      const url = data.publicUrl;
      const { error: e2 } = await supabase
        .from("productos")
        .update({ foto_url: url })
        .eq("id", producto.id);
      if (e2) throw e2;
      setFotoUrl(url);
    } catch {
      setError("No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
    }
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
      <BotonVolver onClick={onCancelar}>Volver</BotonVolver>

      <h1 className="text-2xl font-extrabold">{producto.nombre}</h1>

      {esAdmin && (
        <div className="flex items-center gap-4">
          <FotoProducto
            url={fotoUrl}
            nombre={producto.nombre}
            tipo="empacado"
            className="h-24 w-24 shrink-0"
          />
          <label className="cursor-pointer text-lg font-semibold text-primary underline">
            {subiendo ? "Subiendo…" : "Poner / cambiar foto"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) subirFoto(f);
              }}
            />
          </label>
        </div>
      )}

      {!esAdmin && (
        <p className="rounded-lg bg-warn/10 px-4 py-3 text-lg font-semibold text-warn">
          Solo el administrador puede cambiar el stock y los precios.
        </p>
      )}

      <div className="space-y-2">
        <Label>¿Cuántas unidades hay?</Label>
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
        <CampoDinero value={final} onChange={setFinal} disabled={!esAdmin} />
        <p className="text-base text-muted-foreground">
          {formatCOP(num(final))} — es lo que se cobra al vender.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Valor de la empresa (costo, opcional)</Label>
        <CampoDinero value={empresa} onChange={setEmpresa} disabled={!esAdmin} />
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
          disabled={guardando || subiendo}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      )}
    </div>
  );
}
