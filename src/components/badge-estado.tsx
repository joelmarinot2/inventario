import type { EstadoInventario } from "@/lib/tipos";
import { TEXTO_ESTADO } from "@/lib/unidades";
import { cn } from "@/lib/utils";

const CLASES: Record<EstadoInventario, string> = {
  suficiente: "bg-ok text-ok-foreground",
  queda_poco: "bg-warn text-warn-foreground",
  se_acabo: "bg-danger text-danger-foreground",
};

// Semáforo con texto (nunca solo color): "Hay suficiente", "Queda poco", "Se acabó".
export function BadgeEstado({
  estado,
  className,
}: {
  estado: EstadoInventario;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-base font-bold",
        CLASES[estado],
        className,
      )}
    >
      {TEXTO_ESTADO[estado]}
    </span>
  );
}
