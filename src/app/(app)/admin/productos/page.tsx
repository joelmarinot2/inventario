"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { useRefrescar } from "@/hooks/use-refrescar";
import { cargarProductos } from "@/lib/productos-cliente";
import type { Producto } from "@/lib/tipos";
import { formatCOP } from "@/lib/dinero";
import { mostrarCantidad } from "@/lib/unidades";
import { FotoProducto } from "@/components/foto-producto";
import { Button } from "@/components/ui/button";

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);

  useRefrescar(() => {
    // Incluye inactivos.
    cargarProductos(false).then(setProductos).catch(() => {});
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Productos</h1>
        <Button asChild size="sm">
          <Link href="/admin/productos/nuevo">
            <Plus className="h-6 w-6" /> Nuevo
          </Link>
        </Button>
      </div>

      <ul className="space-y-3">
        {productos.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl border-2 bg-card p-3"
          >
            <FotoProducto
              url={p.foto_url}
              nombre={p.nombre}
              tipo={p.tipo}
              className="h-16 w-16 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-tight">
                {p.nombre}
                {!p.activo && (
                  <span className="ml-2 rounded bg-muted px-2 py-0.5 text-sm text-muted-foreground">
                    inactivo
                  </span>
                )}
              </p>
              <p className="text-base text-muted-foreground">
                {p.tipo === "empacado"
                  ? `${formatCOP(p.precio_paquete ?? 0)} c/u`
                  : `${formatCOP(p.precio_kilo ?? 0)} el kilo`}{" "}
                · {mostrarCantidad(p).principal}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/productos/${p.id}`}>
                <Pencil className="h-5 w-5" /> Editar
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
