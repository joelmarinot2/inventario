"use client";

import { useEffect, useRef } from "react";

// Vuelve a cargar los datos al entrar a la pantalla y al volver a la ventana,
// porque puede haber dos equipos abiertos a la vez. Siempre llama a la versión
// MÁS RECIENTE de `cargar` (así ve el estado actual, p. ej. la fecha elegida).
export function useRefrescar(cargar: () => void) {
  const ref = useRef(cargar);
  ref.current = cargar;

  useEffect(() => {
    ref.current();

    const alEnfocar = () => ref.current();
    const alVerse = () => {
      if (document.visibilityState === "visible") ref.current();
    };

    window.addEventListener("focus", alEnfocar);
    document.addEventListener("visibilitychange", alVerse);
    window.addEventListener("online", alEnfocar);

    return () => {
      window.removeEventListener("focus", alEnfocar);
      document.removeEventListener("visibilitychange", alVerse);
      window.removeEventListener("online", alEnfocar);
    };
  }, []);
}
