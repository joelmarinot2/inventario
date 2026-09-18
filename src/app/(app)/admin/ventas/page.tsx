"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import { formatCOP } from "@/lib/dinero";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface VentaConDetalle {
  id: string;
  fecha: string;
  total: number;
  anulada: boolean;
  perfiles: { nombre: string } | null;
  venta_items: {
    id: string;
    subtotal: number;
    productos: { nombre: string } | null;
  }[];
}

const fmtFechaHora = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

export default function AdminVentasPage() {
  const [ventas, setVentas] = useState<VentaConDetalle[]>([]);
  const [aAnular, setAAnular] = useState<VentaConDetalle | null>(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = () => {
    const supabase = createClient();
    supabase
      .from("ventas")
      .select(
        "id, fecha, total, anulada, perfiles(nombre), venta_items(id, subtotal, productos(nombre))",
      )
      .order("fecha", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setVentas((data ?? []) as unknown as VentaConDetalle[]);
      });
  };

  useRefrescar(cargar);

  const anular = async () => {
    if (!aAnular) return;
    setProcesando(true);
    try {
      const supabase = createClient();
      await supabase.rpc("anular_venta", { p_venta: aAnular.id });
      setAAnular(null);
      cargar();
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Ventas y anulaciones</h1>

      <ul className="space-y-3">
        {ventas.map((v) => (
          <li
            key={v.id}
            className={`rounded-xl border-2 p-4 ${
              v.anulada ? "border-input bg-muted/50" : "bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold">{fmtFechaHora(v.fecha)}</p>
                <p className="text-base text-muted-foreground">
                  {v.perfiles?.nombre ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-2xl font-extrabold tabular-nums ${
                    v.anulada ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {formatCOP(v.total)}
                </p>
                {v.anulada && (
                  <span className="text-base font-bold text-warn">Anulada</span>
                )}
              </div>
            </div>

            <ul className="mt-2 text-base text-muted-foreground">
              {v.venta_items.map((it) => (
                <li key={it.id}>
                  {it.productos?.nombre ?? "—"} · {formatCOP(it.subtotal)}
                </li>
              ))}
            </ul>

            {!v.anulada && (
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => setAAnular(v)}
              >
                Anular venta
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={aAnular != null} onOpenChange={(o) => !o && setAAnular(null)}>
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>¿Anular esta venta?</DialogTitle>
            <DialogDescription>
              El inventario de los productos volverá a su lugar. Esta acción
              queda registrada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setAAnular(null)}
            >
              No
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={anular}
              disabled={procesando}
            >
              {procesando ? "Anulando…" : "Sí, anular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
