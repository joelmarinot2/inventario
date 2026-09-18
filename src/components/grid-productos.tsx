"use client";

import { useMemo, useState } from "react";
import type { Producto, TipoProducto } from "@/lib/tipos";
import {
  estadoInventario,
  mostrarCantidad,
} from "@/lib/unidades";
import { formatCOP } from "@/lib/dinero";
import { FotoProducto } from "@/components/foto-producto";
import { BadgeEstado } from "@/components/badge-estado";

type Filtro = "todos" | TipoProducto;

// Cuadrícula de tarjetas grandes para tocar. Arriba, filtros EMPACADOS / A GRANEL.
export function GridProductos({
  productos,
  ranking,
  onSelect,
  mostrarPrecio = false,
}: {
  productos: Producto[];
  ranking?: Record<string, number>;
  onSelect: (p: Producto) => void;
  mostrarPrecio?: boolean;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const lista = useMemo(() => {
    const filtrados = productos.filter(
      (p) => filtro === "todos" || p.tipo === filtro,
    );
    // Los más vendidos primero (si hay ranking); si no, por nombre.
    return filtrados.sort((a, b) => {
      const ra = ranking?.[a.id] ?? 0;
      const rb = ranking?.[b.id] ?? 0;
      if (rb !== ra) return rb - ra;
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [productos, filtro, ranking]);

  const BotonFiltro = ({ valor, texto }: { valor: Filtro; texto: string }) => (
    <button
      type="button"
      onClick={() => setFiltro(valor)}
      aria-pressed={filtro === valor}
      className={`min-h-16 flex-1 rounded-xl border-2 px-4 text-lg font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring ${
        filtro === valor
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <BotonFiltro valor="todos" texto="Todos" />
        <BotonFiltro valor="empacado" texto="EMPACADOS" />
        <BotonFiltro valor="granel" texto="A GRANEL" />
      </div>

      {lista.length === 0 ? (
        <p className="py-10 text-center text-lg text-muted-foreground">
          No hay productos en este grupo.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {lista.map((p) => {
            const cant = mostrarCantidad(p);
            const estado = estadoInventario(p.stock_base, p.stock_minimo);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p)}
                className="flex flex-col rounded-xl border-2 border-input bg-card p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.99]"
              >
                <div className="relative">
                  <FotoProducto
                    url={p.foto_url}
                    nombre={p.nombre}
                    tipo={p.tipo}
                    className="aspect-square w-full"
                  />
                  {p.tipo === "granel" && (
                    <span className="absolute left-1 top-1 rounded-md bg-primary px-2 py-0.5 text-sm font-bold text-primary-foreground">
                      A GRANEL
                    </span>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 text-lg font-bold leading-tight">
                  {p.nombre}
                </p>

                {mostrarPrecio && (
                  <p className="mt-1 text-lg font-extrabold text-primary">
                    {p.tipo === "empacado"
                      ? `${formatCOP(p.precio_paquete ?? 0)} c/u`
                      : `${formatCOP(p.precio_kilo ?? 0)} el kilo`}
                  </p>
                )}

                <div className="mt-2">
                  <BadgeEstado estado={estado} />
                  <p className="mt-1 text-base text-muted-foreground">
                    {cant.principal}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
