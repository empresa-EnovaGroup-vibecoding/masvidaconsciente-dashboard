// Helpers de formato de moneda para el dashboard.

export function formatUSD(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${v.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBs(v: number | null | undefined): string {
  if (v == null) return "—";
  return `Bs ${v.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatTasa(v: number | null | undefined): string {
  if (v == null) return "—";
  return `Bs ${v.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/$`;
}

// Fechas/horas con guard: si el valor es nulo o inválido devuelve "—" (nunca "Invalid Date").
export function formatFecha(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatHora(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-VE", { hour: "numeric", minute: "2-digit", hour12: true });
}
