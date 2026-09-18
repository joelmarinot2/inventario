"use client";

import { FormularioProducto } from "@/components/admin/formulario-producto";

export default function NuevoProductoPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Nuevo producto</h1>
      <FormularioProducto />
    </div>
  );
}
