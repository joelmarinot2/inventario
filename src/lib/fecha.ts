// Fechas en zona America/Bogota. "Hoy" se define en Bogota.

const TZ = "America/Bogota";

/** Fecha de hoy en Bogota como 'YYYY-MM-DD'. */
export function hoyBogota(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD' y devuelve 'YYYY-MM-DD'. */
export function sumarDias(ymd: string, dias: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** "miércoles, 17 de septiembre de 2025" a partir de 'YYYY-MM-DD'. */
export function fechaLarga(ymd: string): string {
  const dt = new Date(`${ymd}T12:00:00Z`);
  const texto = new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "17 de septiembre" (corto, para encabezados). */
export function fechaCorta(ymd: string): string {
  const dt = new Date(`${ymd}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
  }).format(dt);
}

/** ¿Este 'YYYY-MM-DD' es hoy en Bogota? */
export function esHoy(ymd: string): boolean {
  return ymd === hoyBogota();
}
