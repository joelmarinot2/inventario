"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin = { error: string | null };

export async function login(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos. Intenta de nuevo." };
  }

  redirect("/");
}
