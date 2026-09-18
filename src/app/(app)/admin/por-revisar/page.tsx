"use client";

import { useState } from "react";
import Link from "next/link";
import { useRefrescar } from "@/hooks/use-refrescar";
import { cargarProductos } from "@/lib/productos-cliente";
import type { Producto } from "@/lib/tipos";
import { mostrarCantidad } from "@/lib/unidades";
import { FotoProducto } from "@/components/foto-producto";
import { Button } from "@/components/ui/button";

export default function PorRevisarPage() {
  const [productos, setProductos] = useState<Producto[]>([]);

  useRefrescar(() => {
    cargarProductos(false).then(setProductos).catch(() => {});
  });

  const negativos = productos.filter((p) => p.stock_base < 0);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Por revisar</h1>
      <p className="text-lg text-muted-foreground">
        Productos con inventario en negativo. Ajusta con un conteo físico.
      </p>

      {negativos.length === 0 ? (
        <p className="py-6 text-center text-lg text-ok">
          Todo en orden. No hay inventario negativo.
        </p>
      ) : (
        <ul className="space-y-3">
          {negativos.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border-2 border-danger bg-danger/5 p-3"
            >
              <FotoProducto
                url={p.foto_url}
                nombre={p.nombre}
                tipo={p.tipo}
                className="h-16 w-16 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-tight">{p.nombre}</p>
                <p className="text-xl font-extrabold text-danger">
                  {mostrarCantidad(p).principal}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/admin/ajuste">Ajustar</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
