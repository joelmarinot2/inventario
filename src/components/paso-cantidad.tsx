"use client";

import { Minus, Plus } from "lucide-react";

// Contador con botones − y + grandes. También se puede teclear el número.
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
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => fijar(parseInt(e.target.value || "0", 10))}
          className="w-full bg-transparent text-center text-4xl font-extrabold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
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
