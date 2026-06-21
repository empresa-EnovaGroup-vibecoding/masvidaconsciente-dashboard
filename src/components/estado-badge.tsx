// Badge único de estado de PEDIDO (un solo lugar para color + etiqueta + punto).
import { estiloEstado } from "@/lib/estados";

export function EstadoBadge({ estado }: { estado: string }) {
  const e = estiloEstado(estado);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${e.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${e.dot}`} />
      {e.label}
    </span>
  );
}
