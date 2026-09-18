"use client";

import { useEffect } from "react";

// Vuelve a cargar los datos al entrar a la pantalla y al volver a la ventana,
// porque puede haber dos equipos abiertos a la vez.
export function useRefrescar(cargar: () => void) {
  useEffect(() => {
    cargar();

    const alEnfocar = () => cargar();
    const alVerse = () => {
      if (document.visibilityState === "visible") cargar();
    };

    window.addEventListener("focus", alEnfocar);
    document.addEventListener("visibilitychange", alVerse);
    window.addEventListener("online", alEnfocar);

    return () => {
      window.removeEventListener("focus", alEnfocar);
      document.removeEventListener("visibilitychange", alVerse);
      window.removeEventListener("online", alEnfocar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
