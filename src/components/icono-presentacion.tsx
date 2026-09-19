import type { Presentacion } from "@/lib/tipos";
import { cn } from "@/lib/utils";

// Íconos claros para tarro y bolsa (sin foto). Heredan el color del texto.
export function IconoPresentacion({
  presentacion,
  className,
}: {
  presentacion: Presentacion | null;
  className?: string;
}) {
  if (presentacion === "bolsa") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("text-primary", className)}
        aria-hidden
      >
        <path d="M6 8h12l-1 11.5a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6 8z" />
        <path d="M9 8V6.2a3 3 0 0 1 6 0V8" />
      </svg>
    );
  }
  // tarro (por defecto)
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-primary", className)}
      aria-hidden
    >
      <rect x="6" y="2.5" width="12" height="3.2" rx="1" />
      <path d="M7 6h10v12.8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6z" />
      <line x1="7.5" y1="10.5" x2="16.5" y2="10.5" />
    </svg>
  );
}
