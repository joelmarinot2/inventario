"use client";

import { ArrowLeft } from "lucide-react";

// Botón interactivo para volver (en vez de un texto subrayado).
export function BotonVolver({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-16 items-center gap-2 rounded-full border-2 border-input bg-background px-5 text-lg font-bold transition-[transform,background-color,border-color] duration-150 ease-out-strong hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.97]"
    >
      <ArrowLeft className="h-6 w-6" aria-hidden />
      {children}
    </button>
  );
}
