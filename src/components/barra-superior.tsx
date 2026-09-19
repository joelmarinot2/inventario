"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Rol } from "@/lib/tipos";

// Barra superior fija: el botón "Inicio" está siempre visible. El acceso a
// administración es discreto y solo aparece para el admin.
export function BarraSuperior({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const enInicio = pathname === "/";

  const salir = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b-2 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[900px] items-center justify-between gap-3 px-4">
        {enInicio ? (
          <span className="text-xl font-extrabold">Inventario</span>
        ) : (
          <Link
            href="/"
            className="inline-flex min-h-14 items-center gap-2 rounded-lg border-2 border-input px-4 text-lg font-bold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Home className="h-6 w-6" aria-hidden />
            Inicio
          </Link>
        )}

        <div className="flex items-center gap-2">
          {rol === "admin" && (
            <Link
              href="/admin"
              className="inline-flex min-h-14 items-center gap-2 rounded-lg px-3 text-base font-semibold text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings className="h-6 w-6" aria-hidden />
              <span className="hidden sm:inline">Administración</span>
            </Link>
          )}

          <button
            type="button"
            onClick={salir}
            className="inline-flex min-h-14 items-center gap-2 rounded-lg px-3 text-base font-semibold text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-6 w-6" aria-hidden />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
