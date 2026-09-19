"use client";

import { cn } from "@/lib/utils";

// Agrupa los dígitos en miles con punto: "50000" -> "50.000". Sin decimales.
function agruparMiles(digitos: string): string {
  const limpio = digitos.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!limpio) return "";
  return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Campo para escribir dinero en pesos colombianos. Muestra "$ 50.000" mientras
// se escribe. El valor y el onChange trabajan con SOLO dígitos (ej. "50000").
export function CampoDinero({
  value,
  onChange,
  id,
  placeholder,
  disabled,
  className,
}: {
  value: string;
  onChange: (digitos: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const display = agruparMiles(value ?? "");
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground"
      >
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className={cn(
          "flex min-h-16 w-full rounded-lg border-2 border-input bg-background py-3 pl-9 pr-4 text-lg tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    </div>
  );
}
