"use client";

/** El interruptor de la casa.
 *
 * Vivía suelto dentro de la lista de Métodos de Pago (`configuracion/page.tsx`). Se extrae aquí
 * porque la pantalla de HERRAMIENTAS del agente (fase 4) necesita el MISMO: dos usos justifican
 * la extracción, y reescribirlo habría dejado dos interruptores que se parecen pero no son iguales.
 *
 * `bloqueado` = la opción existe pero NO se puede tocar (una herramienta blindada: el cobro y las
 * redes de seguridad dependen de ella). Se pinta en gris, con el motivo en el tooltip. Se MUESTRA
 * en vez de esconderse a propósito: que la proveedora vea las 12 capacidades del bot y entienda
 * POR QUÉ 7 no se apagan vale más que un menú con huecos inexplicables.
 */
export function Switch({
  activo,
  onChange,
  disabled,
  bloqueado,
  label,
  titulo,
}: {
  activo: boolean;
  onChange: () => void;
  disabled?: boolean;
  bloqueado?: boolean;
  label: string;
  titulo?: string;
}) {
  const inerte = disabled || bloqueado;
  return (
    <button
      type="button"
      onClick={bloqueado ? undefined : onChange}
      disabled={inerte}
      role="switch"
      aria-checked={activo}
      aria-label={label}
      title={titulo ?? (activo ? "Activo (clic para desactivar)" : "Inactivo (clic para activar)")}
      className={`focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        inerte ? "cursor-not-allowed opacity-50" : ""
      } ${activo ? "bg-accent" : "bg-borde"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          activo ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
