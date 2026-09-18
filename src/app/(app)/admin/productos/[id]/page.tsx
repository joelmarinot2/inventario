"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Producto } from "@/lib/tipos";
import { FormularioProducto } from "@/components/admin/formulario-producto";

export default function EditarProductoPage() {
  const params = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("productos")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => {
        setProducto((data as Producto) ?? null);
        setCargado(true);
      });
  }, [params.id]);

  if (!cargado) {
    return <p className="py-10 text-center text-lg text-muted-foreground">Cargando…</p>;
  }
  if (!producto) {
    return <p className="py-10 text-center text-lg">No se encontró el producto.</p>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Editar producto</h1>
      <FormularioProducto producto={producto} />
    </div>
  );
}
