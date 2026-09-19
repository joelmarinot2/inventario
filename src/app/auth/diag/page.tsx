"use client";

import { useEffect, useState } from "react";

// Diagnóstico temporal (corre en el NAVEGADOR). Muestra si las variables
// llegan al navegador, si hay sesión y si se pueden leer los productos.
export default function DiagPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const [out, setOut] = useState<Record<string, unknown>>({ estado: "cargando…" });

  useEffect(() => {
    (async () => {
      const res: Record<string, unknown> = {
        marca: "diag-v1",
        url_presente_en_navegador: Boolean(url),
        url_valor: url,
        key_presente_en_navegador: Boolean(key),
        key_inicio: key ? key.slice(0, 14) : "",
      };
      try {
        if (!url || !key) {
          res.problema =
            "Las variables NO llegaron al navegador (este build se hizo sin ellas o como 'Secreto').";
          setOut(res);
          return;
        }
        const { createBrowserClient } = await import("@supabase/ssr");
        const supabase = createBrowserClient(url, key);

        const u = await supabase.auth.getUser();
        res.usuario = u.data.user?.email ?? null;
        res.authError = u.error?.message ?? null;

        const p = await supabase
          .from("productos")
          .select("id", { count: "exact", head: true })
          .eq("activo", true);
        res.productos_activos = p.count;
        res.productosError = p.error?.message ?? null;

        if (u.data.user) {
          const pr = await supabase
            .from("perfiles")
            .select("rol")
            .eq("id", u.data.user.id)
            .single();
          res.rol = pr.data?.rol ?? null;
          res.perfilError = pr.error?.message ?? null;
        }
      } catch (e) {
        res.excepcion = String((e as Error)?.message ?? e);
      }
      setOut(res);
    })();
  }, [url, key]);

  return (
    <main style={{ padding: 20, fontFamily: "monospace", fontSize: 15 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Diagnóstico</h1>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {JSON.stringify(out, null, 2)}
      </pre>
    </main>
  );
}
