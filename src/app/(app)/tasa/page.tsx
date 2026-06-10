"use client";

import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { getTasa, guardarTasa, type EstadoTasa } from "@/lib/api";

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

  const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("es-VE", { maximumFractionDigits: 2 }));

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Tasa de cambio</h1>
        <p className="text-sm text-fg-muted mt-1">
          Controla la tasa Bs/USD que el bot usa para cobrar. Se aplica al instante.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {estado === null ? (
        <div className="space-y-4 max-w-2xl">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-bg border border-borde animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          {/* Tasa que se cobra hoy */}
          <section className="bg-bg rounded-2xl border border-borde p-5 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[12px] font-medium text-fg-muted mb-1">Tasa que se cobra hoy</p>
                <p className="text-[32px] leading-none font-semibold tracking-tight text-accent tnum">
                  Bs {fmt(estado.tasa_efectiva)}
                </p>
                <p className="text-[12px] text-fg-muted mt-1.5">por cada $1</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-fg-muted">BCV de referencia</p>
                <p className="text-base font-medium text-fg tnum">Bs {fmt(estado.bcv_base)}</p>
                {estado.manual_activa && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    <Lock className="h-3 w-3" strokeWidth={2} />
                    Candado activo
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Margen */}
          <section className="bg-bg rounded-2xl border border-borde p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-fg mb-1">Tu margen</h2>
            <p className="text-[12px] text-fg-muted mb-4 leading-relaxed">
              Un porcentaje que se <span className="font-medium text-fg">suma</span> a la tasa BCV (ej. 2%
              para cubrir comisiones). Déjalo en 0 para cobrar la tasa BCV exacta.
            </p>
            <div className="flex items-center gap-2 max-w-[200px]">
              <input
                className={inputCls}
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
              <span className="text-sm text-fg-muted">%</span>
            </div>
          </section>

          {/* Candado manual */}
          <section className="bg-bg rounded-2xl border border-borde p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-fg mb-1">Candado manual</h2>
            <p className="text-[12px] text-fg-muted mb-4 leading-relaxed">
              Si la fuente de la tasa falla, o quieres fijar la tasa a mano, actívalo y pon el valor exacto.
              El bot usará <span className="font-medium text-fg">ese número</span> (ignora el BCV y el margen)
              hasta que lo desactives.
            </p>

            <label className="flex items-center gap-2.5 text-sm text-fg cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={manualActiva}
                onChange={(e) => {
                  setManualActiva(e.target.checked);
                  setGuardado(false);
                }}
                className="h-4 w-4 rounded"
              />
              Usar tasa manual (candado activado)
            </label>

            <div className="flex items-center gap-2 max-w-[260px]">
              <span className="text-sm text-fg-muted">Bs</span>
              <input
                className={`${inputCls} ${manualActiva ? "" : "opacity-50"}`}
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
              <span className="text-sm text-fg-muted whitespace-nowrap">/ $1</span>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              onClick={guardar}
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            {guardado && !guardando && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
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

const inputCls =
  "w-full rounded-lg border border-borde bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent";
