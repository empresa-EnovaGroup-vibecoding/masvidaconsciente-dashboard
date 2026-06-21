// Estado de "no se pudo cargar" con botón Reintentar. Reemplaza el skeleton
// infinito cuando la carga inicial falla (la API no respondió).
import { AlertCircle } from "lucide-react";

export function ErrorState({
  mensaje,
  onRetry,
  embedded = false,
}: {
  mensaje?: string;
  onRetry: () => void;
  embedded?: boolean;
}) {
  return (
    <div
      role="alert"
      className={embedded ? "py-10 text-center" : "rounded-2xl bg-bg p-12 text-center shadow-card ring-hair"}
    >
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertCircle className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <p className="text-sm font-semibold text-fg">No se pudo cargar</p>
      <p className="mt-1 text-sm font-medium text-fg-muted">
        {mensaje || "Revisa tu conexión e inténtalo de nuevo."}
      </p>
      <button
        onClick={onRetry}
        className="focus-ring mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft"
      >
        Reintentar
      </button>
    </div>
  );
}
