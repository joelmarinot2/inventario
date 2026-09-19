import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BarraSuperior } from "@/components/barra-superior";
import { AvisoSinInternet } from "@/components/aviso-sin-internet";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El portero es solo la sesión (validada por el servidor). El rol se lee en
  // el navegador, donde la identidad del usuario sí viaja con la consulta.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-background">
      <BarraSuperior />
      <AvisoSinInternet />
      <main className="mx-auto w-full max-w-[900px] px-4 py-6">{children}</main>
    </div>
  );
}
