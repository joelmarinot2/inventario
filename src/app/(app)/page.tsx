"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  PackagePlus,
  Boxes,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRefrescar } from "@/hooks/use-refrescar";
import { fechaLarga, hoyBogota } from "@/lib/fecha";
import { formatCOP } from "@/lib/dinero";

const BOTONES = [
  {
    href: "/vender",
    titulo: "VENDER",
    Icono: ShoppingCart,
    clase: "bg-primary text-primary-foreground",
  },
  {
    href: "/llego-mercancia",
    titulo: "LLEGÓ MERCANCÍA",
    Icono: PackagePlus,
    clase: "bg-ok text-ok-foreground",
  },
  {
    href: "/que-me-queda",
    titulo: "¿QUÉ ME QUEDA?",
    Icono: Boxes,
    clase: "bg-secondary text-secondary-foreground",
  },
  {
    href: "/cuanto-vendi",
    titulo: "¿CUÁNTO VENDÍ HOY?",
    Icono: BarChart3,
    clase: "bg-secondary text-secondary-foreground",
  },
];

export default function InicioPage() {
  const [total, setTotal] = useState<number | null>(null);
  const hoy = hoyBogota();

  useRefrescar(() => {
    const supabase = createClient();
    supabase
      .rpc("resumen_dia", { p_fecha: hoy })
      .then(({ data }) => {
        if (data) setTotal(Number((data as { total: number }).total ?? 0));
      });
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border-2 bg-card p-5 text-center">
        <p className="text-lg text-muted-foreground">{fechaLarga(hoy)}</p>
        <p className="mt-1 text-lg font-semibold">Vendido hoy</p>
        <p className="text-4xl font-extrabold tabular-nums">
          {total === null ? "…" : formatCOP(total)}
        </p>
      </section>

      <nav className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BOTONES.map(({ href, titulo, Icono, clase }) => (
          <Link
            key={href}
            href={href}
            className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 text-center text-2xl font-extrabold shadow-sm transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 ${clase}`}
          >
            <Icono className="h-16 w-16" aria-hidden />
            {titulo}
          </Link>
        ))}
      </nav>
    </div>
  );
}
