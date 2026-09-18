"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// Aviso claro cuando se cae el internet, sin tecnicismos.
export function AvisoSinInternet() {
  const [sinInternet, setSinInternet] = useState(false);

  useEffect(() => {
    const actualizar = () => setSinInternet(!navigator.onLine);
    actualizar();
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);

  if (!sinInternet) return null;

  return (
    <div
      role="alert"
      className="sticky top-20 z-30 flex items-center justify-center gap-2 bg-destructive px-4 py-3 text-center text-lg font-bold text-destructive-foreground"
    >
      <WifiOff className="h-6 w-6" aria-hidden />
      No hay internet, revisa el wifi
    </div>
  );
}
