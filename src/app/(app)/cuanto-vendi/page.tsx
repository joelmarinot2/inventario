"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import {
  esHoy,
  fechaCorta,
  fechaLarga,
  hoyBogota,
  sumarDias,
} from "@/lib/fecha";
import { formatCOP } from "@/lib/dinero";
import { formatGramos, mostrarEmpacado } from "@/lib/unidades";
import { Button } from "@/components/ui/button";

interface FilaInforme {
  producto_id: string;
  nombre: string;
  tipo: "empacado" | "granel";
  gramaje_g: number | null;
  paquetes_por_caja: number | null;
  gramos_por_caja: number | null;
  stock_base: number;
  cantidad_base_vendida: number;
  valor_vendido: number;
}

function vendidoTexto(f: FilaInforme): string {
  if (f.tipo === "empacado") {
    return mostrarEmpacado(
      Number(f.cantidad_base_vendida),
      f.paquetes_por_caja ?? 1,
      f.gramaje_g ?? 0,
    ).principal;
  }
  return formatGramos(Number(f.cantidad_base_vendida));
}

function quedaTexto(f: FilaInforme): string {
  if (f.tipo === "empacado") {
    return mostrarEmpacado(
      Number(f.stock_base),
      f.paquetes_por_caja ?? 1,
      f.gramaje_g ?? 0,
    ).principal;
  }
  return formatGramos(Number(f.stock_base));
}

export default function CuantoVendiPage() {
  const [fecha, setFecha] = useState<string>(hoyBogota());
  const [total, setTotal] = useState(0);
  const [numVentas, setNumVentas] = useState(0);
  const [metodos, setMetodos] = useState({
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    otro: 0,
  });
  const [filas, setFilas] = useState<FilaInforme[]>([]);

  const cargar = (f: string) => {
    const supabase = createClient();
    supabase.rpc("resumen_dia", { p_fecha: f }).then(({ data }) => {
      const r = (data ?? {}) as {
        total?: number;
        num_ventas?: number;
        efectivo?: number;
        transferencia?: number;
        tarjeta?: number;
        otro?: number;
      };
      setTotal(Number(r.total ?? 0));
      setNumVentas(Number(r.num_ventas ?? 0));
      setMetodos({
        efectivo: Number(r.efectivo ?? 0),
        transferencia: Number(r.transferencia ?? 0),
        tarjeta: Number(r.tarjeta ?? 0),
        otro: Number(r.otro ?? 0),
      });
    });
    supabase.rpc("informe_diario", { p_fecha: f }).then(({ data }) => {
      setFilas((data ?? []) as FilaInforme[]);
    });
  };

  useRefrescar(() => cargar(fecha));

  const cambiarDia = (dias: number) => {
    const nueva = sumarDias(fecha, dias);
    if (nueva > hoyBogota()) return; // no hay futuro
    setFecha(nueva);
    cargar(nueva);
  };

  const compartirWhatsApp = () => {
    const lineasPago: string[] = [];
    if (metodos.efectivo > 0)
      lineasPago.push(`Efectivo: ${formatCOP(metodos.efectivo)}`);
    if (metodos.transferencia > 0)
      lineasPago.push(`Transferencia: ${formatCOP(metodos.transferencia)}`);
    if (metodos.tarjeta > 0)
      lineasPago.push(`Tarjeta: ${formatCOP(metodos.tarjeta)}`);
    if (metodos.otro > 0) lineasPago.push(`Otro: ${formatCOP(metodos.otro)}`);

    const lineas = [
      `📋 Ventas del ${fechaLarga(fecha)}`,
      `Total: ${formatCOP(total)}`,
      `Número de ventas: ${numVentas}`,
      ...lineasPago,
      "",
      ...filas.map(
        (f) => `• ${f.nombre}: ${vendidoTexto(f)} — ${formatCOP(f.valor_vendido)}`,
      ),
    ];
    const texto = lineas.join("\n");
    if (navigator.share) {
      navigator.share({ text: texto }).catch(() => {});
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(texto)}`,
        "_blank",
        "noopener",
      );
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">¿Cuánto vendí?</h1>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => cambiarDia(-1)}>
          <ChevronLeft className="h-6 w-6" /> Día anterior
        </Button>
        <p className="text-center text-lg font-bold">{fechaCorta(fecha)}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => cambiarDia(1)}
          disabled={esHoy(fecha)}
        >
          Día siguiente <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      <div className="rounded-xl border-2 bg-card p-5 text-center">
        <p className="text-lg text-muted-foreground">{fechaLarga(fecha)}</p>
        <p className="text-lg font-semibold">Total vendido</p>
        <p className="text-5xl font-extrabold tabular-nums">
          {formatCOP(total)}
        </p>
        <p className="mt-2 text-lg text-muted-foreground">
          {numVentas} {numVentas === 1 ? "venta" : "ventas"}
        </p>
      </div>

      {total > 0 && (
        <div className="rounded-xl border-2 bg-card p-4">
          <p className="mb-2 text-lg font-bold">Por forma de pago</p>
          <div className="grid grid-cols-2 gap-2 text-lg">
            <span className="text-muted-foreground">Efectivo</span>
            <span className="text-right font-bold tabular-nums">
              {formatCOP(metodos.efectivo)}
            </span>
            <span className="text-muted-foreground">Transferencia</span>
            <span className="text-right font-bold tabular-nums">
              {formatCOP(metodos.transferencia)}
            </span>
            <span className="text-muted-foreground">Tarjeta</span>
            <span className="text-right font-bold tabular-nums">
              {formatCOP(metodos.tarjeta)}
            </span>
            <span className="text-muted-foreground">Otro</span>
            <span className="text-right font-bold tabular-nums">
              {formatCOP(metodos.otro)}
            </span>
          </div>
        </div>
      )}

      {filas.length === 0 ? (
        <p className="py-6 text-center text-lg text-muted-foreground">
          No hubo ventas este día.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border-2">
          <table className="w-full border-collapse text-left">
            <thead className="bg-muted text-base">
              <tr>
                <th className="p-3 font-bold">Producto</th>
                <th className="p-3 font-bold">Vendido</th>
                <th className="p-3 text-right font-bold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.producto_id} className="border-t-2">
                  <td className="p-3">
                    <p className="text-lg font-bold leading-tight">
                      {f.nombre}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Queda: {quedaTexto(f)}
                    </p>
                  </td>
                  <td className="p-3 text-lg">{vendidoTexto(f)}</td>
                  <td className="p-3 text-right text-lg font-extrabold tabular-nums">
                    {formatCOP(f.valor_vendido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button
        size="lg"
        variant="ok"
        className="w-full"
        onClick={compartirWhatsApp}
        disabled={filas.length === 0 && total === 0}
      >
        <Share2 className="h-6 w-6" /> Enviar por WhatsApp
      </Button>
    </div>
  );
}
