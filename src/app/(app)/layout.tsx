import { redirect } from "next/navigation";
import { getPerfil } from "@/lib/auth";
import { BarraSuperior } from "@/components/barra-superior";
import { AvisoSinInternet } from "@/components/aviso-sin-internet";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");

  return (
    <div className="min-h-dvh bg-background">
      <BarraSuperior rol={perfil.rol} />
      <AvisoSinInternet />
      <main className="mx-auto w-full max-w-[900px] px-4 py-6">{children}</main>
    </div>
  );
}
