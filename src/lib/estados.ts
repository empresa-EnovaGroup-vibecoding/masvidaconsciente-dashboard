// Estados de PEDIDO: fuente ÚNICA de colores y etiquetas para el panel.
// Válidos en la BD (ck_pedido_estado): pendiente, confirmado, preparando,
// entregado, cancelado, esperando_pago, pagado.
// La dueña solo puede FIJAR manualmente los 5 primeros; 'esperando_pago' lo
// pone el bot al generar el cobro y 'pagado' se fija solo al confirmar el pago.

export const ESTADOS_PEDIDO_MANUALES: string[] = [
  "pendiente",
  "confirmado",
  "preparando",
  "entregado",
  "cancelado",
];

export interface EstiloEstado {
  cls: string;
  dot: string;
  label: string;
}

const MAPA: Record<string, EstiloEstado> = {
  pendiente: { cls: "bg-warn-bg text-warn ring-warn-border", dot: "bg-warn", label: "Pendiente" },
  esperando_pago: { cls: "bg-blue-50 text-blue-700 ring-blue-600/15", dot: "bg-blue-500", label: "Esperando pago" },
  confirmado: { cls: "bg-accent/10 text-accent ring-accent/15", dot: "bg-accent", label: "Confirmado" },
  preparando: { cls: "bg-bg-subtle text-fg-muted ring-borde", dot: "bg-fg-faint", label: "Preparando" },
  pagado: { cls: "bg-accent/10 text-accent ring-accent/15", dot: "bg-accent", label: "Pagado" },
  entregado: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500", label: "Entregado" },
  cancelado: { cls: "bg-red-50 text-red-700 ring-red-600/15", dot: "bg-red-500", label: "Cancelado" },
};

/** Estilo + etiqueta de un estado de pedido. Si llega uno desconocido, cae a un
 * neutro y muestra la etiqueta legible (sin guion bajo). */
export function estiloEstado(estado: string): EstiloEstado {
  return (
    MAPA[estado] ?? {
      cls: "bg-bg-subtle text-fg-muted ring-borde",
      dot: "bg-fg-faint",
      label: estado.charAt(0).toUpperCase() + estado.slice(1).replace(/_/g, " "),
    }
  );
}

// ─── Estados de PAGO (reportado/confirmado/rechazado/parcial) ────────────
const MAPA_PAGO: Record<string, { cls: string; label: string }> = {
  reportado: { cls: "bg-warn-bg text-warn ring-warn-border", label: "Por verificar" },
  confirmado: { cls: "bg-accent/10 text-accent ring-accent/15", label: "Confirmado" },
  rechazado: { cls: "bg-red-50 text-red-700 ring-red-600/15", label: "Rechazado" },
  parcial: { cls: "bg-orange-50 text-orange-700 ring-orange-600/15", label: "Pago parcial" },
};

export function estiloPago(estado: string): { cls: string; label: string } {
  return MAPA_PAGO[estado] ?? { cls: "bg-bg-subtle text-fg-muted ring-borde", label: estado };
}

// ─── Motivos por los que el BOT TE NECESITA (pide_ayuda) ─────────────────
// La etiqueta legible la manda el bot (`motivo_texto`): aquí solo el color.
const MAPA_MOTIVO: Record<string, string> = {
  precio_del_dia: "bg-warn-bg text-warn ring-warn-border",
  no_se: "bg-blue-50 text-blue-700 ring-blue-600/15",
  pide_persona: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  reclamo: "bg-red-50 text-red-700 ring-red-600/15",
};

export function estiloMotivo(motivo: string): string {
  return MAPA_MOTIVO[motivo] ?? "bg-bg-subtle text-fg-muted ring-borde";
}
