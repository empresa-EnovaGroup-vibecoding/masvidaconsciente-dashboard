"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  getConfiguracion,
  guardarConfiguracion,
  type ConfiguracionNegocio,
} from "@/lib/api";

const VACIO: ConfiguracionNegocio = {
  negocio_nombre: "",
  negocio_ubicacion: "",
  negocio_pago: "",
  negocio_instagram: "",
  pago_movil_banco: "",
  pago_movil_cedula: "",
  pago_movil_telefono: "",
  pago_movil_titular: "",
  dueno_telefono: "",
  modelo_ia: "",
};

// Modelos que puede usar el bot para conversar. El slug es el identificador de
// OpenRouter; la transcripción de notas de voz NO se ve afectada (va por Gemini).
const MODELOS = [
  { slug: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — económico (~$2 / 1.000 msgs)" },
  { slug: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 — recomendado: listo y barato (~$5,5 / 1.000)" },
  { slug: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 — el más fino para vender (~$16 / 1.000)" },
  { slug: "openai/gpt-4.1", label: "GPT-4.1 (OpenAI) — equilibrado (~$10 / 1.000)" },
];

export default function ConfiguracionPage() {
  const [datos, setDatos] = useState<ConfiguracionNegocio | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    getConfiguracion()
      .then((c) => {
        // null → "" para que los inputs sean controlados
        const limpio = { ...VACIO };
        (Object.keys(VACIO) as (keyof ConfiguracionNegocio)[]).forEach((k) => {
          limpio[k] = c[k] ?? "";
        });
        setDatos(limpio);
      })
      .catch((e) => setError(e.message));
  }, []);

  function set(campo: keyof ConfiguracionNegocio, valor: string) {
    if (!datos) return;
    setDatos({ ...datos, [campo]: valor });
    setGuardado(false);
  }

  async function guardar() {
    if (!datos) return;
    setGuardando(true);
    setError("");
    try {
      await guardarConfiguracion(datos);
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
        <h1 className="text-[26px] font-extrabold num-tight text-fg">Configuración del negocio</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Los datos que el bot usa para atender y cobrar. Se aplican al instante.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-600/15">
          {error}
        </div>
      )}

      {datos === null ? (
        <div className="max-w-2xl space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          <Seccion titulo="Negocio">
            <Campo label="Nombre del negocio">
              <input className={inputCls} value={datos.negocio_nombre ?? ""}
                onChange={(e) => set("negocio_nombre", e.target.value)} />
            </Campo>
            <Campo label="Ubicación">
              <input className={inputCls} value={datos.negocio_ubicacion ?? ""}
                onChange={(e) => set("negocio_ubicacion", e.target.value)}
                placeholder="Ej. Cabudare, Venezuela" />
            </Campo>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo label="Instagram">
                <input className={inputCls} value={datos.negocio_instagram ?? ""}
                  onChange={(e) => set("negocio_instagram", e.target.value)}
                  placeholder="@masvidaconsciente" />
              </Campo>
              <Campo label="Forma de pago (texto)">
                <input className={inputCls} value={datos.negocio_pago ?? ""}
                  onChange={(e) => set("negocio_pago", e.target.value)}
                  placeholder="Ej. Pago Móvil" />
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="Datos de Pago Móvil" nota="Lo que el bot le envía al cliente para cobrar.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo label="Banco">
                <input className={inputCls} value={datos.pago_movil_banco ?? ""}
                  onChange={(e) => set("pago_movil_banco", e.target.value)} />
              </Campo>
              <Campo label="Cédula / RIF">
                <input className={inputCls} value={datos.pago_movil_cedula ?? ""}
                  onChange={(e) => set("pago_movil_cedula", e.target.value)} />
              </Campo>
              <Campo label="Teléfono Pago Móvil">
                <input className={inputCls} value={datos.pago_movil_telefono ?? ""}
                  onChange={(e) => set("pago_movil_telefono", e.target.value)} />
              </Campo>
              <Campo label="Titular">
                <input className={inputCls} value={datos.pago_movil_titular ?? ""}
                  onChange={(e) => set("pago_movil_titular", e.target.value)} />
              </Campo>
            </div>
          </Seccion>

          <Seccion
            titulo="Avisos a la dueña"
            nota="WhatsApp donde te llegan los avisos de pago. Debe ser DISTINTO al número del bot (un número no puede escribirse a sí mismo)."
          >
            <Campo label="WhatsApp de avisos">
              <input className={inputCls} value={datos.dueno_telefono ?? ""}
                onChange={(e) => set("dueno_telefono", e.target.value)}
                placeholder="Ej. 584121234567" />
            </Campo>
          </Seccion>

          <Seccion
            titulo="Modelo de IA (avanzado)"
            nota="El cerebro con el que el bot conversa. Si sientes que ignora matices (tono, qué producto es cuál), prueba uno más inteligente. Ojo: las notas de voz se transcriben siempre con Gemini — esto no las cambia."
          >
            <Campo label="Modelo del bot">
              <select
                className={inputCls}
                value={datos.modelo_ia || "google/gemini-2.5-flash"}
                onChange={(e) => set("modelo_ia", e.target.value)}
              >
                {MODELOS.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Campo>
          </Seccion>

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

const inputCls =
  "focus-ring w-full rounded-xl bg-bg px-3 py-2 text-sm text-fg ring-1 ring-borde placeholder:text-fg-faint";

function Seccion({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
      <h2 className="text-lg font-semibold num-snug text-fg">{titulo}</h2>
      {nota && <p className="mt-1 mb-4 text-sm font-medium leading-relaxed text-fg-muted">{nota}</p>}
      <div className={`space-y-3 ${nota ? "" : "mt-4"}`}>{children}</div>
    </section>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-fg-muted">{label}</label>
      {children}
    </div>
  );
}
