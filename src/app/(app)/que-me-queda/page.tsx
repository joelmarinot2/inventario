"use client";

import { useState } from "react";
import { useRefrescar } from "@/hooks/use-refrescar";
import { cargarProductos } from "@/lib/productos-cliente";
import type { EstadoInventario, Producto } from "@/lib/tipos";
import { estadoInventario, mostrarCantidad } from "@/lib/unidades";
import { FotoProducto } from "@/components/foto-producto";
import { BadgeEstado } from "@/components/badge-estado";

const ORDEN: Record<EstadoInventario, number> = {
  se_acabo: 0,
  queda_poco: 1,
  suficiente: 2,
};

export default function QueMeQuedaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargado, setCargado] = useState(false);

  useRefrescar(() => {
    cargarProductos()
      .then((p) => {
        setProductos(p);
        setCargado(true);
      })
      .catch(() => setCargado(true));
  });

  const lista = [...productos].sort((a, b) => {
    const ea = estadoInventario(a.stock_base, a.stock_minimo);
    const eb = estadoInventario(b.stock_base, b.stock_minimo);
    if (ORDEN[ea] !== ORDEN[eb]) return ORDEN[ea] - ORDEN[eb];
    return a.nombre.localeCompare(b.nombre, "es");
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">¿Qué me queda?</h1>
        <p className="text-lg text-muted-foreground">
          Primero lo que se está acabando.
        </p>
      </div>

      {cargado && lista.length === 0 && (
        <p className="text-lg text-muted-foreground">No hay productos.</p>
      )}

      <ul className="space-y-3">
        {lista.map((p) => {
          const cant = mostrarCantidad(p);
          const estado = estadoInventario(p.stock_base, p.stock_minimo);
          return (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-xl border-2 bg-card p-3"
            >
              <FotoProducto
                url={p.foto_url}
                nombre={p.nombre}
                tipo={p.tipo}
                className="h-20 w-20 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold leading-tight">{p.nombre}</p>
                <p className="text-2xl font-extrabold">{cant.principal}</p>
                <p className="text-base text-muted-foreground">
                  {cant.detalle}
                </p>
              </div>
              <BadgeEstado estado={estado} className="shrink-0" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
