// Estado vacío reutilizable (un solo lugar para "aún no hay …").
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  titulo,
  texto,
  embedded = false,
}: {
  icon: LucideIcon;
  titulo: string;
  texto: string;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? "px-6 py-12 text-center" : "rounded-2xl bg-bg p-12 text-center shadow-card ring-hair"}>
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <p className="text-sm font-semibold text-fg">{titulo}</p>
      <p className="mt-1 text-sm font-medium text-fg-muted">{texto}</p>
    </div>
  );
}
