"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import { formatCOP } from "@/lib/dinero";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CampoDinero } from "@/components/ui/campo-dinero";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ResumenCaja {
  caja_id: string;
  base_efectivo: number;
  cerrada: boolean;
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  otro: number;
  total: number;
  num_ventas: number;
}

export default function CajaPage() {
  const [abierta, setAbierta] = useState<boolean | null>(null);
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [base, setBase] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [cerrada, setCerrada] = useState<ResumenCaja | null>(null);

  const cargar = () => {
    const supabase = createClient();
    supabase.rpc("caja_abierta").then(({ data, error: e }) => {
      if (e) return; // fallo pasajero: no cambiar lo que se ve
      const hayCaja = !!data;
      setAbierta(hayCaja);
      if (hayCaja) {
        supabase
          .rpc("resumen_caja", { p_caja_id: null })
          .then(({ data: r, error: e2 }) => {
            if (e2) return;
            setResumen((r as ResumenCaja) ?? null);
          });
      } else {
        setResumen(null);
      }
    });
  };

  useRefrescar(cargar);

  const iniciarDia = async () => {
    setProcesando(true);
    setError(null);
    setAviso(null);
    try {
      const supabase = createClient();
      const b = parseInt(base.replace(/\D/g, ""), 10);
      const { data, error: e } = await supabase.rpc("abrir_caja", {
        p_base: Number.isFinite(b) ? b : 0,
      });
      if (e) throw e;
      if ((data as { ya_abierta?: boolean })?.ya_abierta) {
        setAviso(
          "La caja ya estaba abierta (quizás desde otro equipo). Se usa esa caja.",
        );
      }
      setBase("");
      cargar();
    } catch {
      setError("No se pudo iniciar el día. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const cerrarCaja = async () => {
    setProcesando(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: e } = await supabase.rpc("cerrar_caja");
      if (e) throw e;
      setConfirmarCierre(false);
      setCerrada((data as ResumenCaja) ?? null);
      setAbierta(false);
      setResumen(null);
    } catch {
      setError("No se pudo cerrar la caja. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  // ---- Caja recién cerrada: resumen final ----
  if (cerrada) {
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-extrabold">Caja cerrada</h1>
        <TarjetaResumen r={cerrada} />
        <Button asChild size="lg" className="w-full">
          <Link href="/">Ir a Inicio</Link>
        </Button>
      </div>
    );
  }

  if (abierta === null) {
    return (
      <p className="py-16 text-center text-lg text-muted-foreground">
        Cargando…
      </p>
    );
  }

  // ---- No hay caja abierta: iniciar día ----
  if (!abierta) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold">Iniciar día</h1>
          <p className="text-lg text-muted-foreground">
            Escribe con cuánto dinero en efectivo empiezas la caja.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Base en efectivo</Label>
          <CampoDinero value={base} onChange={setBase} placeholder="Ej: 50.000" />
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
          onClick={iniciarDia}
          disabled={procesando}
        >
          {procesando ? "Iniciando…" : "Iniciar día"}
        </Button>
      </div>
    );
  }

  // ---- Caja abierta: estado + cerrar ----
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Caja del día</h1>
      {aviso && (
        <p className="rounded-lg bg-warn/10 px-4 py-3 text-lg font-semibold text-warn">
          {aviso}
        </p>
      )}
      {resumen && <TarjetaResumen r={resumen} />}

      {error && (
        <p role="alert" className="text-lg font-semibold text-destructive">
          {error}
        </p>
      )}

      <Button
        size="lg"
        variant="danger"
        className="w-full"
        onClick={() => setConfirmarCierre(true)}
        disabled={procesando}
      >
        Cerrar caja
      </Button>

      <Dialog open={confirmarCierre} onOpenChange={setConfirmarCierre}>
        <DialogContent showClose={false}>
          <DialogHeader>
            <DialogTitle>¿Cerrar la caja de hoy?</DialogTitle>
            <DialogDescription>
              Después de cerrar no se puede vender hasta volver a iniciar el día.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setConfirmarCierre(false)}
            >
              No, todavía no
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={cerrarCaja}
              disabled={procesando}
            >
              {procesando ? "Cerrando…" : "Sí, cerrar caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TarjetaResumen({ r }: { r: ResumenCaja }) {
  const efectivoEnCaja = Number(r.base_efectivo) + Number(r.efectivo);
  const fila = (etiqueta: string, valor: number, fuerte = false) => (
    <div className="flex items-center justify-between border-b py-3 last:border-b-0">
      <span className={fuerte ? "text-xl font-bold" : "text-lg"}>
        {etiqueta}
      </span>
      <span
        className={`tabular-nums ${fuerte ? "text-2xl font-extrabold" : "text-xl font-semibold"}`}
      >
        {formatCOP(valor)}
      </span>
    </div>
  );

  return (
    <div className="rounded-xl border-2 bg-card p-5">
      {fila("Base con la que empezó", Number(r.base_efectivo))}
      {fila("Ventas en efectivo", Number(r.efectivo))}
      {fila("Efectivo que debe haber en caja", efectivoEnCaja, true)}
      <div className="my-2 h-2" />
      {fila("Transferencias", Number(r.transferencia))}
      {fila("Tarjeta", Number(r.tarjeta))}
      {fila("Otros", Number(r.otro))}
      <div className="my-2 h-2" />
      {fila("Total vendido", Number(r.total), true)}
      <p className="pt-2 text-base text-muted-foreground">
        {r.num_ventas} {r.num_ventas === 1 ? "venta" : "ventas"}
      </p>
    </div>
  );
}
