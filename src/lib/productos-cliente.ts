import { createClient } from "@/lib/supabase/client";
import type { Producto } from "@/lib/tipos";

// Carga los productos activos, ordenados por nombre.
export async function cargarProductos(
  soloActivos = true,
): Promise<Producto[]> {
  const supabase = createClient();
  let q = supabase.from("productos").select("*").order("nombre");
  if (soloActivos) q = q.eq("activo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Producto[];
}
