"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import { cargarProductos } from "@/lib/productos-cliente";
import type { MotivoAjuste, Producto } from "@/lib/tipos";
import { mostrarCantidad, formatGramos } from "@/lib/unidades";
import { GridProductos } from "@/components/grid-productos";
import { BotonVolver } from "@/components/boton-volver";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const MOTIVOS: { valor: MotivoAjuste; texto: string }[] = [
  { valor: "conteo", texto: "Conteo físico" },
  { valor: "merma", texto: "Merma" },
  { valor: "dano", texto: "Daño" },
  { valor: "otro", texto: "Otro" },
];

export default function AjustePage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sel, setSel] = useState<Producto | null>(null);

  useRefrescar(() => {
    cargarProductos(false).then(setProductos).catch(() => {});
  });

  if (sel) {
    return (
      <AjustarProducto
        producto={sel}
        onListo={() => {
          setSel(null);
          cargarProductos(false).then(setProductos).catch(() => {});
        }}
        onCancelar={() => setSel(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Ajustar inventario</h1>
      <p className="text-lg text-muted-foreground">
        Toca el producto que quieres ajustar.
      </p>
      <GridProductos productos={productos} onSelect={setSel} />
    </div>
  );
}

function AjustarProducto({
  producto,
  onListo,
  onCancelar,
}: {
  producto: Producto;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const esEmpacado = producto.tipo === "empacado";
  const unidad = esEmpacado ? "paquetes" : "gramos";

  const [nuevo, setNuevo] = useState(String(producto.stock_base));
  const [motivo, setMotivo] = useState<MotivoAjuste>("conteo");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const nuevoNum = parseInt(nuevo || "0", 10);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: e } = await supabase.rpc("ajustar_inventario", {
        p_producto: producto.id,
        p_nuevo_stock: nuevoNum,
        p_motivo: motivo,
        p_nota: nota.trim() || null,
      });
      if (e) throw e;
      setOk(true);
    } catch {
      setError("No se pudo ajustar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  if (ok) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-2xl font-extrabold text-ok">✔ Inventario ajustado</p>
        <p className="text-xl font-bold">{producto.nombre}</p>
        <Button size="lg" className="w-full" onClick={onListo}>
          Ajustar otro producto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BotonVolver onClick={onCancelar}>Elegir otro producto</BotonVolver>

      <h1 className="text-2xl font-extrabold">{producto.nombre}</h1>

      <div className="rounded-xl border-2 bg-muted p-4">
        <p className="text-lg text-muted-foreground">Ahora la app dice</p>
        <p className="text-2xl font-extrabold">{mostrarCantidad(producto).principal}</p>
      </div>

      <div className="space-y-2">
        <Label>Nuevo inventario (en {unidad})</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
        />
        {!esEmpacado && (
          <p className="text-base text-muted-foreground">
            = {formatGramos(nuevoNum)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Motivo</Label>
        <div className="grid grid-cols-2 gap-3">
          {MOTIVOS.map((m) => (
            <button
              key={m.valor}
              type="button"
              onClick={() => setMotivo(m.valor)}
              className={`min-h-16 rounded-xl border-2 text-lg font-bold ${
                motivo === m.valor
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background"
              }`}
            >
              {m.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nota">Nota (opcional)</Label>
        <Input id="nota" value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="text-lg font-semibold text-destructive">
          {error}
        </p>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={guardar}
        disabled={guardando}
      >
        {guardando ? "Guardando…" : "Guardar ajuste"}
      </Button>
    </div>
  );
}
