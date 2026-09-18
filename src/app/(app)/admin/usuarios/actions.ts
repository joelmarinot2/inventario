"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getPerfil } from "@/lib/auth";

export type EstadoUsuario = { error: string | null; ok: string | null };

// Crea un usuario. El registro público está desactivado, así que los usuarios
// los crea el administrador. Usa la clave secreta (service_role) SOLO en el
// servidor: nunca llega al navegador.
export async function crearUsuario(
  _prev: EstadoUsuario,
  formData: FormData,
): Promise<EstadoUsuario> {
  const perfil = await getPerfil();
  if (!perfil || perfil.rol !== "admin") {
    return { error: "No tienes permiso.", ok: null };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol") ?? "vendedor");

  if (!email || !password) {
    return { error: "Escribe el correo y la contraseña.", ok: null };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres.", ok: null };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      error:
        "Crear usuarios desde la app no está configurado. Créalo en el panel de Supabase (Authentication > Users), o configura SUPABASE_SERVICE_ROLE_KEY en el servidor.",
      ok: null,
    };
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol },
  });

  if (error) {
    return { error: `No se pudo crear: ${error.message}`, ok: null };
  }

  return { error: null, ok: `Usuario ${email} creado.` };
}
