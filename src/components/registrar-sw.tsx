"use client";

import { useEffect } from "react";

// Registra el service worker (para que la app sea instalable) y hace que la
// app se actualice sola: cuando entra una versión nueva, recarga una vez.
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const habiaControlador = !!navigator.serviceWorker.controller;
    let recargado = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.update())
      .catch(() => {});

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Solo recarga si ya había una versión antes (evita recarga en la 1ª visita).
      if (!habiaControlador || recargado) return;
      recargado = true;
      window.location.reload();
    });
  }, []);

  return null;
}
