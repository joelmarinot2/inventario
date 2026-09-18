"use client";

import { useState } from "react";
import type { ItemCarrito, Producto } from "@/lib/tipos";
import {
  BOTONES_RAPIDOS_GRANEL,
  formatGramos,
  formatKgDecimal,
  gramosPorPlata,
  precioCajaGranel,
  precioLibra,
  valorPorPeso,
} from "@/lib/unidades";
import { formatCOP } from "@/lib/dinero";
import { TecladoNumerico } from "@/components/teclado-numerico";
import { PasoCantidad } from "@/components/paso-cantidad";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const es = new Intl.NumberFormat("es-CO");

export function ConfigurarGranel({
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
  const precioKilo = producto.precio_kilo ?? 0;

  const [tab, setTab] = useState("peso");
  const [gramos, setGramos] = useState(""); // modo peso
  const [plata, setPlata] = useState(""); // modo plata
  const [bultos, setBultos] = useState(1); // modo caja
  const [pendiente, setPendiente] = useState<ItemCarrito | null>(null);

  const gramosNum = parseInt(gramos || "0", 10);
  const plataNum = parseInt(plata || "0", 10);

  const gramosDePlata = gramosPorPlata(plataNum, precioKilo);
  const precioCaja = precioCajaGranel(producto);

  const construir = (): ItemCarrito | null => {
    if (tab === "peso") {
      if (gramosNum <= 0) return null;
      return {
        clave: crypto.randomUUID(),
        producto,
        unidad: "gramo",
        modo: "peso",
        cantidad: gramosNum,
        cantidad_base: gramosNum,
        subtotal: valorPorPeso(gramosNum, precioKilo),
        etiqueta: `${es.format(gramosNum)} g`,
      };
    }
    if (tab === "plata") {
      if (plataNum <= 0) return null;
      return {
        clave: crypto.randomUUID(),
        producto,
        unidad: "gramo",
        modo: "plata",
        cantidad: gramosDePlata,
        valor_objetivo: plataNum,
        cantidad_base: gramosDePlata,
        subtotal: plataNum,
        etiqueta: `${formatCOP(plataNum)} (${es.format(gramosDePlata)} g)`,
      };
    }
    // caja completa
    if (bultos <= 0) return null;
    return {
      clave: crypto.randomUUID(),
      producto,
      unidad: "caja",
      cantidad: bultos,
      cantidad_base: bultos * (producto.gramos_por_caja ?? 0),
      subtotal: bultos * precioCaja,
      etiqueta: `${bultos} ${bultos === 1 ? "bulto" : "bultos"}`,
    };
  };

  const intentarAgregar = () => {
    const item = construir();
    if (!item) return;
    if (item.cantidad_base > stockDisponible) {
      setPendiente(item);
      return;
    }
    onAgregar(item);
  };

  const item = construir();
  const puedeAgregar = item != null;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onCancelar}
        className="text-lg font-semibold text-primary underline"
      >
        ← Elegir otro producto
      </button>

      <div>
        <h1 className="text-2xl font-extrabold">{producto.nombre}</h1>
        <p className="text-lg text-muted-foreground">
          {formatCOP(precioKilo)} el kilo · {formatCOP(precioLibra(precioKilo))}{" "}
          la libra
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="peso">Por peso</TabsTrigger>
          <TabsTrigger value="plata">Por plata</TabsTrigger>
          <TabsTrigger value="caja">Bulto completo</TabsTrigger>
        </TabsList>

        {/* ---- Por peso ---- */}
        <TabsContent value="peso" className="space-y-4">
          <p className="text-center text-xl font-bold">¿Cuánto pesó?</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BOTONES_RAPIDOS_GRANEL.map((b) => (
              <button
                key={b.gramos}
                type="button"
                onClick={() => setGramos(String(b.gramos))}
                className="min-h-16 rounded-xl border-2 border-input bg-background px-2 text-base font-bold hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
              >
                {b.etiqueta}
                <span className="block text-sm font-normal text-muted-foreground">
                  {b.gramos} g
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border-2 bg-muted p-4 text-center">
            <p className="text-4xl font-extrabold tabular-nums">
              {es.format(gramosNum)} g → {formatCOP(valorPorPeso(gramosNum, precioKilo))}
            </p>
            <p className="text-lg text-muted-foreground">
              = {formatGramos(gramosNum)} · {formatKgDecimal(gramosNum)} kg
            </p>
          </div>

          <TecladoNumerico value={gramos} onChange={setGramos} maxLen={6} />
        </TabsContent>

        {/* ---- Por plata ---- */}
        <TabsContent value="plata" className="space-y-4">
          <p className="text-center text-xl font-bold">
            ¿Cuánta plata quiere llevar?
          </p>
          <div className="rounded-xl border-2 bg-muted p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">
              {formatCOP(plataNum)}
            </p>
            <p className="mt-1 text-4xl font-extrabold text-primary">
              Pesa {es.format(gramosDePlata)} g
            </p>
            <p className="text-lg text-muted-foreground">
              = {formatGramos(gramosDePlata)}
            </p>
          </div>
          <TecladoNumerico value={plata} onChange={setPlata} maxLen={7} />
        </TabsContent>

        {/* ---- Bulto completo ---- */}
        <TabsContent value="caja" className="space-y-4">
          <p className="text-center text-xl font-bold">
            ¿Cuántos bultos completos?
          </p>
          <p className="text-center text-base text-muted-foreground">
            Cada bulto: {formatGramos(producto.gramos_por_caja ?? 0)} ·{" "}
            {formatCOP(precioCaja)}
          </p>
          <PasoCantidad value={bultos} onChange={setBultos} min={1} />
          <div className="rounded-xl border-2 bg-card p-4 text-center">
            <p className="text-lg text-muted-foreground">Subtotal</p>
            <p className="text-4xl font-extrabold tabular-nums">
              {formatCOP(bultos * precioCaja)}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Button
        size="lg"
        className="w-full"
        onClick={intentarAgregar}
        disabled={!puedeAgregar}
      >
        Agregar
      </Button>

      <Dialog
        open={pendiente != null}
        onOpenChange={(o) => !o && setPendiente(null)}
      >
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>¿Vender de todas formas?</DialogTitle>
            <DialogDescription>
              Según la app solo quedan {formatGramos(Math.max(stockDisponible, 0))}{" "}
              de {producto.nombre}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setPendiente(null)}
            >
              No, corregir
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                if (pendiente) onAgregar(pendiente);
                setPendiente(null);
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
