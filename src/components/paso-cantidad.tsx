"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

// Contador con botones − y + grandes. También se puede teclear el número:
// mientras se escribe se permite dejar el campo vacío; al salir se corrige.
export function PasoCantidad({
  value,
  onChange,
  min = 0,
  max = 9999,
  sufijo,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  sufijo?: string;
}) {
  const fijar = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  const [texto, setTexto] = useState(String(value));

  // Si el valor cambia desde afuera (botones − / +), reflejarlo en el campo.
  useEffect(() => {
    setTexto(String(value));
  }, [value]);

  const alEscribir = (s: string) => {
    const limpio = s.replace(/\D/g, "");
    setTexto(limpio);
    if (limpio === "") return; // todavía escribiendo: no forzar el mínimo
    const n = parseInt(limpio, 10);
    if (Number.isFinite(n)) fijar(n);
  };

  const alSalir = () => {
    if (texto === "") setTexto(String(value));
  };

  return (
    <div className="flex items-stretch justify-center gap-3">
      <button
        type="button"
        onClick={() => fijar(value - 1)}
        aria-label="Quitar uno"
        disabled={value <= min}
        className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-input bg-background transition-[transform,background-color] duration-100 ease-out-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100"
      >
        <Minus className="h-9 w-9" />
      </button>

      <div className="flex min-w-32 flex-1 items-center justify-center rounded-xl border-2 border-input px-4">
        <input
          type="text"
          inputMode="numeric"
          value={texto}
          onChange={(e) => alEscribir(e.target.value)}
          onBlur={alSalir}
          className="w-full bg-transparent text-center text-4xl font-extrabold tabular-nums focus:outline-none"
          aria-label="Cantidad"
        />
        {sufijo && (
          <span className="ml-1 text-lg text-muted-foreground">{sufijo}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => fijar(value + 1)}
        aria-label="Agregar uno"
        disabled={value >= max}
        className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-input bg-background transition-[transform,background-color] duration-100 ease-out-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100"
      >
        <Plus className="h-9 w-9" />
      </button>
    </div>
  );
}
