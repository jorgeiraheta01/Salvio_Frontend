const TZ_SUFFIX = /[Zz]$|[+-]\d{2}:?\d{2}$/;

/**
 * El backend devuelve datetimes sin offset de zona horaria (ej. "2026-07-24T16:00:00"),
 * pero representan UTC. `new Date(...)` interpreta un string sin sufijo de timezone
 * como hora LOCAL del navegador, lo que desplaza cualquier hora mostrada por el offset
 * local completo (ej. 6h en El Salvador). Se normaliza agregando "Z" antes de parsear.
 */
export function parseServerDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") && !TZ_SUFFIX.test(value) ? `${value}Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatServerTime(value: string | null | undefined): string {
  const date = parseServerDateTime(value);
  return date ? date.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", hour12: true }) : "N/D";
}

export function formatServerDateTime(value: string | null | undefined): string {
  const date = parseServerDateTime(value);
  return date
    ? date.toLocaleString("es-SV", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "N/D";
}

/**
 * Formatea solo la parte de fecha (sin hora), a salvo de desplazamientos de dia por
 * timezone: extrae year/month/day directamente del string y los formatea en UTC, en vez
 * de dejar que el navegador reinterprete el instante en su propia zona horaria.
 */
export function formatServerDate(value: string | null | undefined): string {
  if (!value) return "N/D";
  const datePart = value.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "N/D";
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}
