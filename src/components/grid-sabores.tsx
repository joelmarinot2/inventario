"use client";

import type { GrupoSabor } from "@/lib/agrupar";
import { FotoProducto } from "@/components/foto-producto";

// Cuadrícula de "cajas" por sabor (Achiras con chocolate, etc.).
export function GridSabores({
  grupos,
  onSelect,
}: {
  grupos: GrupoSabor[];
  onSelect: (sabor: string) => void;
}) {
  if (grupos.length === 0) {
    return (
      <p className="py-10 text-center text-lg text-muted-foreground">
        No hay productos.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {grupos.map((g) => {
        const foto = g.items.find((p) => p.foto_url)?.foto_url ?? null;
        const paquetes = g.items.reduce(
          (s, p) => s + Math.max(p.stock_base, 0),
          0,
        );
        return (
          <button
            key={g.sabor}
            type="button"
            onClick={() => onSelect(g.sabor)}
            className="flex flex-col rounded-xl border-2 border-input bg-card p-3 text-left transition-[transform,border-color] duration-150 ease-out-strong hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.97]"
          >
            {/* Foto del sabor (una por sabor). */}
            <FotoProducto
              url={foto}
              nombre={g.sabor}
              tipo="empacado"
              className="aspect-square w-full"
            />
            <p className="mt-2 line-clamp-2 text-lg font-bold leading-tight">
              {g.sabor}
            </p>
            <p className="mt-1 text-base text-muted-foreground">
              {paquetes} unidades
            </p>
          </button>
        );
      })}
    </div>
  );
}
