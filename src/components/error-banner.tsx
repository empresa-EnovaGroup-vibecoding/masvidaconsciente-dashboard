// Banner de error reutilizable: un solo lugar para el estilo de los errores del
// panel. Devuelve null si no hay mensaje, así las pantallas solo escriben
// <ErrorBanner mensaje={error} /> sin el condicional repetido.

export function ErrorBanner({
  mensaje,
  className = "mb-6",
}: {
  mensaje?: string | null;
  className?: string;
}) {
  if (!mensaje) return null;
  return (
    <div
      className={`rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-600/15 ${className}`}
    >
      {mensaje}
    </div>
  );
}
