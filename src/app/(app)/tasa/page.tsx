"use client";

import { useEffect, useState } from "react";
import { Check, Lock, RefreshCw } from "lucide-react";
import { getTasa, guardarTasa, type EstadoTasa } from "@/lib/api";
import { formatBs } from "@/lib/format";
import { ErrorBanner } from "@/components/error-banner";
import { inputCls } from "@/lib/ui";

export default function TasaPage() {
  const [estado, setEstado] = useState<EstadoTasa | null>(null);
  const [margen, setMargen] = useState("");
  const [manual, setManual] = useState("");
  const [manualActiva, setManualActiva] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function cargar() {
    getTasa()
      .then((t) => {
        setEstado(t);
        setMargen(t.margen_pct ? String(t.margen_pct) : "");
        setManual(t.manual_valor !== null ? String(t.manual_valor) : "");
        setManualActiva(t.manual_activa);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar() {
    setGuardando(true);
    setError("");
    try {
      await guardarTasa({
        margen_pct: margen.trim() === "" ? 0 : Number(margen),
        ...(manual.trim() === "" ? {} : { manual_valor: Number(manual) }),
        manual_activa: manualActiva,
      });
      setGuardado(true);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[26px] font-extrabold num-tight text-fg">Tasa de cambio</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Controla la tasa Bs/USD que el bot usa para cobrar. Se aplica al instante.
        </p>
      </header>

      <ErrorBanner mensaje={error} />

      {estado === null ? (
        <div className="max-w-2xl space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Tasa que se cobra hoy */}
          <section className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-sm font-semibold text-fg-muted">Tasa que se cobra hoy</p>
                <p className="text-4xl font-extrabold num-tight text-fg tnum">{formatBs(estado.tasa_efectiva)}</p>
                <p className="mt-1.5 text-sm font-medium text-fg-muted">por cada $1</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-fg-muted">BCV de referencia</p>
                <p className="text-base font-bold text-fg tnum">{formatBs(estado.bcv_base)}</p>
                {estado.manual_activa ? (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-semibold text-warn ring-1 ring-warn-border">
                    <Lock className="h-3 w-3" strokeWidth={2} />
                    Candado activo
                  </span>
                ) : (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                    <RefreshCw className="h-3 w-3" strokeWidth={2} />
                    Automática
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Margen */}
          <section className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
            <h2 className="mb-1 text-lg font-semibold num-snug text-fg">Tu margen</h2>
            <p className="mb-4 text-sm font-medium leading-relaxed text-fg-muted">
              Un porcentaje que se <span className="font-semibold text-fg">suma</span> a la tasa BCV (ej. 2%
              para cubrir comisiones). Déjalo en 0 para cobrar la tasa BCV exacta.
            </p>
            <div className="flex max-w-[200px] items-center gap-2">
              <input
                className={inputCls}
                aria-label="Margen en porcentaje"
                type="number"
                step="0.1"
                min="0"
                value={margen}
                onChange={(e) => {
                  setMargen(e.target.value);
                  setGuardado(false);
                }}
                placeholder="0"
              />
              <span className="text-sm font-medium text-fg-muted">%</span>
            </div>
          </section>

          {/* Candado manual */}
          <section className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
            <h2 className="mb-1 text-lg font-semibold num-snug text-fg">Candado manual</h2>
            <p className="mb-4 text-sm font-medium leading-relaxed text-fg-muted">
              Si la fuente de la tasa falla, o quieres fijar la tasa a mano, actívalo y pon el valor exacto.
              El bot usará <span className="font-semibold text-fg">ese número</span> (ignora el BCV y el margen)
              hasta que lo desactives.
            </p>

            <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-fg">
              <input
                type="checkbox"
                checked={manualActiva}
                onChange={(e) => {
                  setManualActiva(e.target.checked);
                  setGuardado(false);
                }}
                className="h-4 w-4 rounded accent-accent"
              />
              Usar tasa manual (candado activado)
            </label>

            <div className="flex max-w-[260px] items-center gap-2">
              <span className="text-sm font-medium text-fg-muted">Bs</span>
              <input
                className={`${inputCls} ${manualActiva ? "" : "opacity-50"}`}
                aria-label="Tasa manual en bolívares por dólar"
                type="number"
                step="0.01"
                min="0"
                value={manual}
                onChange={(e) => {
                  setManual(e.target.value);
                  setGuardado(false);
                }}
                placeholder="Ej. 40.50"
              />
              <span className="whitespace-nowrap text-sm font-medium text-fg-muted">/ $1</span>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              onClick={guardar}
              disabled={guardando}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            {guardado && !guardando && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                <Check className="h-4 w-4" strokeWidth={2} />
                Guardado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
