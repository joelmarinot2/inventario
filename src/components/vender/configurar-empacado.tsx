"use client";

import { useState } from "react";
import type { ItemCarrito, Producto, UnidadVenta } from "@/lib/tipos";
import { precioCajaEmpacado } from "@/lib/unidades";
import { formatCOP } from "@/lib/dinero";
import { PasoCantidad } from "@/components/paso-cantidad";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function ConfigurarEmpacado({
  producto,
  stockDisponible,
  onAgregar,
  onCancelar,
}: {
  producto: Producto;
  stockDisponible: number;
  onAgregar: (item: ItemCarrito) => void;
  onCancelar: () => void;
}) {
  const [unidad, setUnidad] = useState<UnidadVenta>("paquete");
  const [cantidad, setCantidad] = useState(1);
  const [confirmar, setConfirmar] = useState(false);

  const paqPorCaja = producto.paquetes_por_caja ?? 1;
  const precioPaquete = producto.precio_paquete ?? 0;
  const precioCaja = precioCajaEmpacado(producto);

  const base =
    unidad === "caja" ? cantidad * paqPorCaja : cantidad;
  const subtotal =
    unidad === "caja" ? cantidad * precioCaja : cantidad * precioPaquete;

  const construir = (): ItemCarrito => ({
    clave: crypto.randomUUID(),
    producto,
    unidad,
    cantidad,
    cantidad_base: base,
    subtotal,
    etiqueta:
      unidad === "caja"
        ? `${cantidad} ${cantidad === 1 ? "caja" : "cajas"}`
        : `${cantidad} ${cantidad === 1 ? "paquete" : "paquetes"}`,
  });

  const intentarAgregar = () => {
    if (base > stockDisponible) {
      setConfirmar(true);
      return;
    }
    onAgregar(construir());
  };

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

      <div className="flex gap-3">
        <BotonUnidad
          activo={unidad === "paquete"}
          onClick={() => setUnidad("paquete")}
          titulo="Paquete"
          precio={formatCOP(precioPaquete)}
        />
        {paqPorCaja > 1 && (
          <BotonUnidad
            activo={unidad === "caja"}
            onClick={() => setUnidad("caja")}
            titulo="Caja"
            precio={formatCOP(precioCaja)}
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-center text-xl font-bold">
          ¿Cuántas {unidad === "caja" ? "cajas" : "paquetes"}?
        </p>
        <PasoCantidad value={cantidad} onChange={setCantidad} min={1} />
        {unidad === "caja" && (
          <p className="text-center text-base text-muted-foreground">
            {cantidad * paqPorCaja} paquetes en total
          </p>
        )}
      </div>

      <div className="rounded-xl border-2 bg-card p-4 text-center">
        <p className="text-lg text-muted-foreground">Subtotal</p>
        <p className="text-4xl font-extrabold tabular-nums">
          {formatCOP(subtotal)}
        </p>
      </div>

      <Button size="lg" className="w-full" onClick={intentarAgregar}>
        Agregar
      </Button>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>¿Vender de todas formas?</DialogTitle>
            <DialogDescription>
              Según la app solo quedan {Math.max(stockDisponible, 0)} paquetes
              de {producto.nombre}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setConfirmar(false)}
            >
              No, corregir
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                setConfirmar(false);
                onAgregar(construir());
              }}
            >
              Sí, vender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BotonUnidad({
  activo,
  onClick,
  titulo,
  precio,
}: {
  activo: boolean;
  onClick: () => void;
  titulo: string;
  precio: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`min-h-20 flex-1 rounded-xl border-2 p-3 text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring ${
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent"
      }`}
    >
      <span className="block text-xl font-bold">{titulo}</span>
      <span className="block text-lg">{precio}</span>
    </button>
  );
}
