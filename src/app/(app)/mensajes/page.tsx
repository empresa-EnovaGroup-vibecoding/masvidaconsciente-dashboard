"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { getGuiasMensajes, guardarGuiasMensajes, type GuiasMensajes } from "@/lib/api";

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

  useEffect(() => {
    getGuiasMensajes()
      .then((g) => setDatos({ ...VACIO, ...g }))
      .catch((e) => setError(e.message));
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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Mensajes automáticos</h1>
        <p className="text-sm text-fg-muted mt-1">
          Los momentos clave del cobro. Tú escribes la <span className="font-medium text-fg">intención</span> y el
          bot la redacta natural (no es una plantilla fija).
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {datos === null ? (
        <div className="space-y-4 max-w-2xl">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-bg border border-borde animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5 max-w-2xl">
          {CAMPOS.map((c) => (
            <section key={c.key} className="bg-bg rounded-2xl border border-borde p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-fg mb-1">{c.label}</h2>
              <p className="text-[12px] text-fg-muted mb-3 leading-relaxed">{c.help}</p>
              <textarea
                value={datos[c.key]}
                onChange={(e) => set(c.key, e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-borde bg-bg px-3.5 py-2.5 text-[13px] leading-relaxed text-fg resize-y focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </section>
          ))}

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

          <div className="rounded-xl bg-bg-subtle/60 border border-borde p-4 text-[12px] text-fg-muted leading-relaxed">
            💡 La <span className="font-medium text-fg">bienvenida</span> y el tono general los controlas en{" "}
            <span className="font-medium text-fg">Mi Bot</span> (la personalidad). Aquí solo afinas los
            momentos del cobro. Y recuerda: el bot <span className="font-medium text-fg">nunca</span> dice que un
            pago está confirmado hasta que tú lo confirmes — eso está blindado.
          </div>
        </div>
      )}
    </div>
  );
}
