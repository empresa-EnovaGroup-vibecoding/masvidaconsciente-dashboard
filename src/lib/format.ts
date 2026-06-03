// Helpers de formato de moneda para el dashboard.

export function formatUSD(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${v.toFixed(2)}`;
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
