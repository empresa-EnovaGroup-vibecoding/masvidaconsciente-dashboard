"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { getGuiasMensajes, guardarGuiasMensajes, type GuiasMensajes } from "@/lib/api";
import { inputCls } from "@/lib/ui";

const CAMPOS: { key: keyof GuiasMensajes; label: string; help: string }[] = [
  {
    key: "msg_guia_comprobante",
    label: "Cuando el cliente envía su comprobante",
    help: "Qué decirle al recibir su captura de pago, ANTES de que tú lo verifiques.",
  },
  {
    key: "msg_guia_confirmado",
    label: "Cuando confirmas el pago",
    help: "Qué decirle al cliente cuando tú confirmas su pago desde el panel.",
  },
  {
    key: "msg_guia_rechazado",
    label: "Cuando el pago no se pudo verificar",
    help: "Qué decirle cuando rechazas o no se pudo verificar el pago.",
  },
];

const VACIO: GuiasMensajes = {
  msg_guia_confirmado: "",
  msg_guia_rechazado: "",
  msg_guia_comprobante: "",
};

export default function MensajesPage() {
  const [datos, setDatos] = useState<GuiasMensajes | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function cargar() {
    setError("");
    getGuiasMensajes()
      .then((g) => setDatos({ ...VACIO, ...g }))
      .catch((e) => setError((e as Error).message));
  }

  useEffect(() => {
    cargar();
  }, []);

  function set(campo: keyof GuiasMensajes, valor: string) {
    if (!datos) return;
    setDatos({ ...datos, [campo]: valor });
    setGuardado(false);
  }

  async function guardar() {
    if (!datos) return;
    setGuardando(true);
    setError("");
    try {
      await guardarGuiasMensajes(datos);
      setGuardado(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Mensajes automáticos</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Los momentos clave del cobro. Tú escribes la <span className="font-semibold text-fg">intención</span> y el
          bot la redacta natural (no es una plantilla fija).
        </p>
      </header>

      {datos !== null && <ErrorBanner mensaje={error} />}

      {error && datos === null ? (
        <div className="max-w-2xl">
          <ErrorState mensaje={error} onRetry={cargar} />
        </div>
      ) : datos === null ? (
        <div className="max-w-2xl space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {CAMPOS.map((c) => (
            <section key={c.key} className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
              <h2 className="mb-1 text-lg font-semibold num-snug text-fg">{c.label}</h2>
              <p className="mb-4 text-sm font-medium leading-relaxed text-fg-muted">{c.help}</p>
              <textarea
                value={datos[c.key]}
                onChange={(e) => set(c.key, e.target.value)}
                rows={3}
                aria-label={c.label}
                className={`${inputCls} resize-y leading-relaxed`}
              />
            </section>
          ))}

          <div className="flex items-center gap-3">
            <button
              onClick={guardar}
              disabled={guardando}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
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

          <div className="rounded-2xl bg-bg-subtle/60 p-5 text-sm font-medium leading-relaxed text-fg-muted ring-hair">
            La <span className="font-semibold text-fg">bienvenida</span> y el tono general los controlas en{" "}
            <span className="font-semibold text-fg">Mi Bot</span> (la personalidad). Aquí solo afinas los
            momentos del cobro. Y recuerda: el bot <span className="font-semibold text-fg">nunca</span> dice que un
            pago está confirmado hasta que tú lo confirmes — eso está blindado.
          </div>
        </div>
      )}
    </div>
  );
}
