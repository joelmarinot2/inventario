import { Package, Scale } from "lucide-react";
import type { TipoProducto } from "@/lib/tipos";
import { cn } from "@/lib/utils";

// Muestra la foto del producto, o un ícono claro si no tiene foto.
export function FotoProducto({
  url,
  nombre,
  tipo,
  className,
}: {
  url: string | null;
  nombre: string;
  tipo: TipoProducto;
  className?: string;
}) {
  const Icono = tipo === "granel" ? Scale : Package;
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={nombre}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <Icono className="h-1/2 w-1/2 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}
