"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// El acceso a administración se valida por rol desde el navegador (donde la
// identidad viaja con la consulta). Además, la base de datos (RLS) exige admin
// para cualquier escritura, así que la seguridad real está en la base.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<"cargando" | "ok" | "no">("cargando");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.rol === "admin") {
            setEstado("ok");
          } else {
            setEstado("no");
            router.replace("/");
          }
        });
    });
  }, [router]);

  if (estado !== "ok") {
    return (
      <p className="py-16 text-center text-lg text-muted-foreground">
        Cargando…
      </p>
    );
  }

  return <>{children}</>;
}
