import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Diagnóstico temporal: muestra qué ve el SERVIDOR (sesión, perfil y cookies).
// Ruta pública (bajo /auth) para poder consultarla aunque no haya sesión.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((c) => c.name);

  let perfil: unknown = null;
  let perfilError: string | null = null;
  if (user) {
    const r = await supabase
      .from("perfiles")
      .select("rol,nombre")
      .eq("id", user.id)
      .single();
    perfil = r.data;
    perfilError = r.error?.message ?? null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return NextResponse.json({
    servidor_ve_usuario: user?.email ?? null,
    authError: error?.message ?? null,
    perfil,
    perfilError,
    cookiesQueVeElServidor: cookieNames,
    tieneUrl: Boolean(url),
    tieneKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    projectRef: url.replace(/^https?:\/\//, "").split(".")[0],
  });
}
