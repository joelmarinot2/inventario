import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/tipos";

// Devuelve el perfil del usuario autenticado (con su rol), o null.
export async function getPerfil(): Promise<Perfil | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Perfil | null) ?? null;
}
