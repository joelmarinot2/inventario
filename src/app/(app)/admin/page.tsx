import Link from "next/link";
import {
  Package,
  SlidersHorizontal,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
  Users,
} from "lucide-react";

const OPCIONES = [
  {
    href: "/admin/productos",
    titulo: "Productos y precios",
    desc: "Crear y editar productos.",
    Icono: Package,
  },
  {
    href: "/admin/ajuste",
    titulo: "Ajustar inventario",
    desc: "Conteo físico, merma, daño.",
    Icono: SlidersHorizontal,
  },
  {
    href: "/admin/por-revisar",
    titulo: "Por revisar",
    desc: "Productos con inventario negativo.",
    Icono: AlertTriangle,
  },
  {
    href: "/admin/ventas",
    titulo: "Ventas y anulaciones",
    desc: "Ver y anular ventas.",
    Icono: Receipt,
  },
  {
    href: "/admin/informes",
    titulo: "Informes por fechas",
    desc: "Rango de fechas y exportar a Excel/CSV.",
    Icono: FileSpreadsheet,
  },
  {
    href: "/admin/usuarios",
    titulo: "Usuarios",
    desc: "Crear usuarios y cambiar el rol.",
    Icono: Users,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Administración</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OPCIONES.map(({ href, titulo, desc, Icono }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 rounded-xl border-2 bg-card p-5 hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
          >
            <Icono className="h-10 w-10 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-xl font-bold leading-tight">{titulo}</p>
              <p className="text-base text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
