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

/**
 * Una fecha SIN hora ("2026-08-05"), como la que devuelve un `date` de Postgres.
 *
 * 🔴 NO USAR `formatFecha` PARA ESTO. `new Date("2026-08-05")` se parsea como **medianoche UTC**,
 * y en Venezuela (UTC-4) eso pinta el **día ANTERIOR**: comprobado, da "04 ago. 2026". En la fecha
 * de entrega prometida a un cliente, equivocarse un día cuesta la venta — y el bot sí la tiene
 * bien, sería solo el panel mintiendo. Aquí se construye con los componentes por separado, que es
 * medianoche LOCAL. (Auditoría 2026-08-02.)
 */
export function formatFechaSola(s: string | null | undefined): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return "—";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatHora(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-VE", { hour: "numeric", minute: "2-digit", hour12: true });
}
