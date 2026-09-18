"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hoyBogota, sumarDias } from "@/lib/fecha";
import { formatCOP } from "@/lib/dinero";
import { formatGramos, mostrarEmpacado } from "@/lib/unidades";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface FilaRango {
  producto_id: string;
  nombre: string;
  tipo: "empacado" | "granel";
  gramaje_g: number | null;
  paquetes_por_caja: number | null;
  gramos_por_caja: number | null;
  cantidad_base_vendida: number;
  valor_vendido: number;
}

const vendido = (f: FilaRango) =>
  f.tipo === "empacado"
    ? mostrarEmpacado(
        Number(f.cantidad_base_vendida),
        f.paquetes_por_caja ?? 1,
        f.gramaje_g ?? 0,
      ).principal
    : formatGramos(Number(f.cantidad_base_vendida));

export default function InformesPage() {
  const [desde, setDesde] = useState(sumarDias(hoyBogota(), -7));
  const [hasta, setHasta] = useState(hoyBogota());
  const [filas, setFilas] = useState<FilaRango[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultar = async () => {
    setCargando(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: e } = await supabase.rpc("informe_rango", {
        p_desde: desde,
        p_hasta: hasta,
      });
      if (e) throw e;
      setFilas((data ?? []) as FilaRango[]);
    } catch {
      setError("No se pudo consultar el informe.");
    } finally {
      setCargando(false);
    }
  };

  const total = filas.reduce((s, f) => s + Number(f.valor_vendido), 0);

  const descargarCSV = () => {
    const encabezado = ["Producto", "Tipo", "Vendido", "Valor"];
    const filasCsv = filas.map((f) => [
      f.nombre,
      f.tipo,
      vendido(f),
      String(f.valor_vendido),
    ]);
    const escapar = (c: string) => `"${c.replace(/"/g, '""')}"`;
    const csv = [encabezado, ...filasCsv, ["", "", "TOTAL", String(total)]]
      .map((fila) => fila.map(escapar).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe_${desde}_a_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Informes por fechas</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="desde">Desde</Label>
          <Input
            id="desde"
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hasta">Hasta</Label>
          <Input
            id="hasta"
            type="date"
            value={hasta}
            min={desde}
            max={hoyBogota()}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={consultar} disabled={cargando}>
        {cargando ? "Consultando…" : "Ver informe"}
      </Button>

      {error && (
        <p role="alert" className="text-lg font-semibold text-destructive">
          {error}
        </p>
      )}

      {filas.length > 0 && (
        <>
          <div className="rounded-xl border-2 bg-card p-4 text-center">
            <p className="text-lg text-muted-foreground">Total del rango</p>
            <p className="text-4xl font-extrabold tabular-nums">
              {formatCOP(total)}
            </p>
          </div>

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
                    <td className="p-3 text-lg font-bold">{f.nombre}</td>
                    <td className="p-3 text-lg">{vendido(f)}</td>
                    <td className="p-3 text-right text-lg font-extrabold tabular-nums">
                      {formatCOP(f.valor_vendido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            size="lg"
            variant="ok"
            className="w-full"
            onClick={descargarCSV}
          >
            <Download className="h-6 w-6" /> Descargar Excel/CSV
          </Button>
        </>
      )}
    </div>
  );
}
