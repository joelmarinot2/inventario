"use client";

import { Delete } from "lucide-react";

// Teclado numérico propio con teclas grandes. Nunca pide decimales.
// Es controlado: el valor es un string de dígitos.
export function TecladoNumerico({
  value,
  onChange,
  maxLen = 9,
}: {
  value: string;
  onChange: (nuevo: string) => void;
  maxLen?: number;
}) {
  const escribir = (d: string) => {
    // Sin ceros a la izquierda inútiles.
    const siguiente = (value === "0" ? "" : value) + d;
    if (siguiente.replace(/\D/g, "").length > maxLen) return;
    onChange(siguiente.replace(/^0+(?=\d)/, ""));
  };
  const borrar = () => onChange(value.slice(0, -1));
  const limpiar = () => onChange("");

  const Tecla = ({
    children,
    onClick,
    ariaLabel,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    ariaLabel?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex min-h-20 items-center justify-center rounded-xl border-2 border-input bg-background text-3xl font-bold hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.98]"
    >
      {children}
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <Tecla key={d} onClick={() => escribir(d)}>
          {d}
        </Tecla>
      ))}
      <Tecla onClick={limpiar} ariaLabel="Borrar todo">
        C
      </Tecla>
      <Tecla onClick={() => escribir("0")}>0</Tecla>
      <Tecla onClick={borrar} ariaLabel="Borrar último">
        <Delete className="h-8 w-8" />
      </Tecla>
    </div>
  );
}
