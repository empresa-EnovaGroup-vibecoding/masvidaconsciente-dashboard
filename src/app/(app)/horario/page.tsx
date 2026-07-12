"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import {
  getConfiguracion,
  guardarConfiguracion,
  getFeriados,
  crearFeriado,
  borrarFeriado,
  type Feriado,
} from "@/lib/api";
import { inputCls } from "@/lib/ui";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";

// El orden importa: así se guardan y así los lee el bot (sin acentos, como en la base).
const DIAS = [
  { clave: "lunes", nombre: "Lunes" },
  { clave: "martes", nombre: "Martes" },
  { clave: "miercoles", nombre: "Miércoles" },
  { clave: "jueves", nombre: "Jueves" },
  { clave: "viernes", nombre: "Viernes" },
  { clave: "sabado", nombre: "Sábado" },
  { clave: "domingo", nombre: "Domingo" },
];

/** La fecha como la diría una persona: "sábado 18 de julio". */
function fechaBonita(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(a, (m ?? 1) - 1, d ?? 1);
  return f.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" });
}

export default function HorarioPage() {
  const [dias, setDias] = useState<string[] | null>(null);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoMotivo, setNuevoMotivo] = useState("");

  const cargar = useCallback(() => {
    setError("");
    getConfiguracion()
      .then((c) =>
        setDias(
          (c.dias_entrega ?? "lunes,martes,miercoles,jueves,viernes,sabado")
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
        ),
      )
      .catch((e) => setError(e.message));
    getFeriados().then(setFeriados).catch(() => {});
  }, []);

  useEffect(cargar, [cargar]);

  async function alternarDia(clave: string) {
    if (!dias) return;
    const nuevos = dias.includes(clave) ? dias.filter((d) => d !== clave) : [...dias, clave];
    // Se guardan en el orden de la semana, no en el orden en que se hizo clic.
    const ordenados = DIAS.filter((d) => nuevos.includes(d.clave)).map((d) => d.clave);
    setDias(ordenados);
    setGuardando(true);
    setError("");
    try {
      await guardarConfiguracion({ dias_entrega: ordenados.join(",") });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function agregarFeriado() {
    if (!nuevaFecha) return;
    setError("");
    try {
      await crearFeriado(nuevaFecha, nuevoMotivo.trim() || null);
      setNuevaFecha("");
      setNuevoMotivo("");
      getFeriados().then(setFeriados).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el día");
    }
  }

  async function quitarFeriado(fecha: string) {
    setError("");
    try {
      await borrarFeriado(fecha);
      setFeriados((f) => f.filter((x) => x.fecha !== fecha));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar el día");
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Horario</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Los días en que entregas. El bot <span className="font-semibold text-fg">no puede</span>{" "}
          prometerle a un cliente un día que no esté aquí.
        </p>
      </header>

      <ErrorBanner mensaje={error} />

      {error && dias === null ? (
        <ErrorState mensaje={error} onRetry={cargar} />
      ) : dias === null ? (
        <div className="h-56 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
            <h2 className="text-[17px] font-extrabold num-snug text-fg">¿Qué días entregas?</h2>
            <p className="mt-1 mb-5 text-[13px] font-medium text-fg-muted">
              Toca un día para encenderlo o apagarlo. Se guarda solo.
              {guardando && <span className="ml-2 text-accent">Guardando…</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => {
                const activo = dias.includes(d.clave);
                return (
                  <button
                    key={d.clave}
                    onClick={() => alternarDia(d.clave)}
                    aria-pressed={activo}
                    className={`focus-ring rounded-xl px-4 py-2.5 text-[13px] font-semibold ring-1 ring-inset transition ${
                      activo
                        ? "bg-accent text-accent-fg ring-accent"
                        : "bg-bg text-fg-muted ring-borde hover:bg-bg-subtle"
                    }`}
                  >
                    {d.nombre}
                    <span className="ml-2 text-[11px] font-medium opacity-80">
                      {activo ? "entrego" : "cerrado"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
            <div className="mb-1 flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warn-bg text-warn ring-1 ring-warn-border">
                <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </div>
              <h2 className="text-[17px] font-extrabold num-snug text-fg">Días cerrados</h2>
            </div>
            <p className="mb-5 text-[13px] font-medium text-fg-muted">
              Feriados, vacaciones, un viaje. El bot deja de ofrecer esas fechas
              automáticamente y le propone al cliente el próximo día bueno.
            </p>

            <div className="mb-4 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-fg-muted">Fecha</span>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className={`${inputCls} w-44`}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[12px] font-semibold text-fg-muted">
                  Motivo (opcional, para ti)
                </span>
                <input
                  type="text"
                  value={nuevoMotivo}
                  onChange={(e) => setNuevoMotivo(e.target.value)}
                  placeholder="Viaje, feriado, descanso…"
                  className={inputCls}
                />
              </label>
              <button
                onClick={agregarFeriado}
                disabled={!nuevaFecha}
                className="focus-ring flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Cerrar ese día
              </button>
            </div>

            {feriados.length === 0 ? (
              <p className="text-[13px] font-medium text-fg-faint">
                No tienes días cerrados. Solo aplican los días de arriba.
              </p>
            ) : (
              <ul className="space-y-2">
                {feriados.map((f) => (
                  <li
                    key={f.fecha}
                    className="flex items-center justify-between gap-3 rounded-xl bg-bg-subtle p-3 ring-hair"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-fg">{fechaBonita(f.fecha)}</p>
                      {f.motivo && (
                        <p className="truncate text-xs font-medium text-fg-muted">{f.motivo}</p>
                      )}
                    </div>
                    <button
                      onClick={() => quitarFeriado(f.fecha)}
                      aria-label={`Quitar ${f.fecha}`}
                      className="focus-ring rounded-lg p-1.5 text-fg-muted transition hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="px-1 text-[13px] font-medium text-fg-muted">
            ¿Y los productos que necesitan tiempo? Eso va en cada producto, en{" "}
            <a href="/catalogo" className="font-semibold text-accent underline">
              Catálogo
            </a>{" "}
            → <span className="font-semibold text-fg">días de anticipación</span> (los congelados
            pueden salir el mismo día; una torta hay que hornearla).
          </p>
        </div>
      )}
    </div>
  );
}
