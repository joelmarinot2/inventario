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

// Ranking de "más vendidos" -> { producto_id: veces }.
export async function cargarRanking(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data } = await supabase.rpc("ranking_productos");
  const mapa: Record<string, number> = {};
  ((data ?? []) as { producto_id: string; veces: number }[]).forEach((r) => {
    mapa[r.producto_id] = Number(r.veces);
  });
  return mapa;
}
