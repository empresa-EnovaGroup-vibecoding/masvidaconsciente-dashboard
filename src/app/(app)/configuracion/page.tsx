"use client";

import React, { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import {
  getConfiguracion,
  guardarConfiguracion,
  type ConfiguracionNegocio,
} from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { inputCls } from "@/lib/ui";

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

// Deja solo los dígitos de un teléfono (acepta "+", espacios, guiones, paréntesis).
function soloDigitos(crudo: string): string {
  return (crudo ?? "").replace(/\D/g, "");
}

// Valida el WhatsApp de avisos por sus DÍGITOS (10-15). No rechaza por formato:
// "+58 412…" o "0412…" son válidos. Vacío también es válido aquí.
function validarTelefonoDueno(crudo: string): string {
  const valor = soloDigitos(crudo);
  if (!valor) return "";
  if (valor.length < 10 || valor.length > 15) {
    return "El WhatsApp de avisos debe tener entre 10 y 15 dígitos.";
  }
  return "";
}

export default function ConfiguracionPage() {
  const [datos, setDatos] = useState<ConfiguracionNegocio | null>(null);
  const [cargaFallida, setCargaFallida] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  function cargar() {
    setCargaFallida(false);
    setError("");
    getConfiguracion()
      .then((c) => {
        // null → "" para que los inputs sean controlados
        const limpio = { ...VACIO };
        (Object.keys(VACIO) as (keyof ConfiguracionNegocio)[]).forEach((k) => {
          limpio[k] = c[k] ?? "";
        });
        setDatos(limpio);
      })
      .catch((e: Error) => {
        setError(e.message);
        setCargaFallida(true);
      });
  }

  useEffect(() => {
    cargar();
  }, []);

  function set(campo: keyof ConfiguracionNegocio, valor: string) {
    if (!datos) return;
    setDatos({ ...datos, [campo]: valor });
    setGuardado(false);
  }

  async function guardar() {
    if (!datos) return;
    // Validación: el WhatsApp de avisos NO puede ser el número del bot (que es el
    // Pago Móvil); un número no puede escribirse a sí mismo.
    const errTel = validarTelefonoDueno(datos.dueno_telefono ?? "");
    if (errTel) {
      setError(errTel);
      setGuardado(false);
      return;
    }
    const avisos = soloDigitos(datos.dueno_telefono ?? "");
    const bot = soloDigitos(datos.pago_movil_telefono ?? "");
    // Mismo número aunque esté escrito distinto (con/sin "+", con/sin el 0 inicial):
    // comparamos los últimos 10 dígitos (área + abonado).
    if (avisos && bot && avisos.slice(-10) === bot.slice(-10)) {
      setError("El WhatsApp de avisos debe ser DISTINTO al número del bot (Pago Móvil): un número no puede escribirse a sí mismo.");
      setGuardado(false);
      return;
    }
    // Guardamos el WhatsApp de avisos ya normalizado (solo dígitos).
    const datosGuardar = avisos ? { ...datos, dueno_telefono: avisos } : datos;
    setGuardando(true);
    setError("");
    try {
      await guardarConfiguracion(datosGuardar);
      setDatos(datosGuardar);
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

      {datos !== null && <ErrorBanner mensaje={error} />}

      {datos === null && cargaFallida ? (
        <div className="max-w-2xl">
          <ErrorState mensaje={error} onRetry={cargar} />
        </div>
      ) : datos === null ? (
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

function Campo({ label, children }: { label: string; children: React.ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium text-fg-muted">
        {label}
      </label>
      {React.cloneElement(children, { id })}
    </div>
  );
}
