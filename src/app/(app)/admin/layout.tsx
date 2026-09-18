import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";

// Toda la sección de administración exige rol admin. Además de la RLS en la
// base, se bloquea el acceso a las pantallas.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfil();
  if (!perfil || perfil.rol !== "admin") redirect("/");
  return <>{children}</>;
}
