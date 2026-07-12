"use client";

import React, { useEffect, useId, useState } from "react";
import { Check, Plus, Pencil, Trash2, X, Wallet } from "lucide-react";
import {
  getConfiguracion,
  guardarConfiguracion,
  getMetodosPago,
  crearMetodoPago,
  actualizarMetodoPago,
  borrarMetodoPago,
  type ConfiguracionNegocio,
  type MetodoPago,
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
  dias_entrega: "",
  modelo_ia: "",
};

// Modelos que puede usar el bot para conversar. El slug es el identificador de
// OpenRouter; la transcripción de notas de voz NO se ve afectada (va por Gemini).
const MODELOS = [
  { slug: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2 — el más barato y muy bueno (~$1 / 1.000 msgs)" },
  { slug: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — Gemini económico (~$1 / 1.000)" },
  { slug: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — equilibrio, multimodal (~$2 / 1.000)" },
  { slug: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 — confiable para cobrar (~$5,5 / 1.000)" },
  { slug: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 — el más fino para vender (~$16 / 1.000)" },
  { slug: "openai/gpt-4.1", label: "GPT-4.1 (OpenAI) — equilibrado (~$10 / 1.000)" },
];

// Tipos de método de pago que el bot ofrece y con los que reconoce los cobros.
const TIPOS_METODO = [
  { key: "Pago Móvil", campos: ["banco", "telefono", "cedula", "titular"] },
  { key: "Transferencia", campos: ["banco", "cuenta", "cedula", "titular"] },
  { key: "Zelle", campos: ["correo", "titular"] },
  { key: "Binance", campos: ["wallet", "correo"] },
  { key: "Efectivo", campos: [] },
  { key: "Otro", campos: ["instrucciones"] },
] as const;

// Etiqueta legible de cada campo de un método de pago.
const ETIQUETA_CAMPO: Record<string, string> = {
  banco: "Banco",
  telefono: "Teléfono",
  cedula: "Cédula / RIF",
  cuenta: "Número de cuenta",
  titular: "Titular",
  correo: "Correo",
  wallet: "Billetera / Wallet",
  instrucciones: "Instrucciones",
};

// Devuelve los campos relevantes para un tipo (si el tipo no está en la lista,
// se muestran todos para no esconder datos cargados).
function camposDeTipo(tipo: string): readonly string[] {
  const t = TIPOS_METODO.find((x) => x.key === tipo);
  return t ? t.campos : ["banco", "telefono", "cedula", "cuenta", "titular", "correo", "wallet", "instrucciones"];
}

type FormMetodo = {
  id?: number;
  tipo: string;
  titulo: string;
  titular: string;
  banco: string;
  telefono: string;
  cedula: string;
  cuenta: string;
  correo: string;
  wallet: string;
  instrucciones: string;
  activo: boolean;
};

const FORM_METODO_VACIO: FormMetodo = {
  tipo: "Pago Móvil",
  titulo: "",
  titular: "",
  banco: "",
  telefono: "",
  cedula: "",
  cuenta: "",
  correo: "",
  wallet: "",
  instrucciones: "",
  activo: true,
};

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
  // true cuando la dueña eligió "Personalizado" para pegar un ID de modelo a mano.
  const [modeloCustom, setModeloCustom] = useState(false);

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
        <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Configuración del negocio</h1>
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

          <MetodosPago />

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
            nota="El cerebro con el que el bot conversa. Si sientes que ignora matices (tono, qué producto es cuál), prueba uno más inteligente. Elige uno de la lista o 'Personalizado' para pegar el ID exacto de cualquier modelo de openrouter.ai/models. Ojo: las notas de voz y la visión de comprobantes van siempre con Gemini — esto no las cambia."
          >
            <Campo label="Modelo del bot">
              {(() => {
                const actual = datos.modelo_ia || "google/gemini-2.5-flash";
                const enLista = MODELOS.some((m) => m.slug === actual);
                const mostrarCustom = modeloCustom || (!!datos.modelo_ia && !enLista);
                return (
                  <>
                    <select
                      className={inputCls}
                      value={mostrarCustom ? "__custom__" : actual}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setModeloCustom(true);
                          set("modelo_ia", "");
                        } else {
                          setModeloCustom(false);
                          set("modelo_ia", e.target.value);
                        }
                      }}
                    >
                      {MODELOS.map((m) => (
                        <option key={m.slug} value={m.slug}>
                          {m.label}
                        </option>
                      ))}
                      <option value="__custom__">
                        Personalizado — pegar ID de OpenRouter…
                      </option>
                    </select>
                    {mostrarCustom && (
                      <input
                        className={`${inputCls} mt-2`}
                        value={datos.modelo_ia ?? ""}
                        onChange={(e) => set("modelo_ia", e.target.value.trim())}
                        placeholder="ej. deepseek/deepseek-v3.2"
                      />
                    )}
                  </>
                );
              })()}
            </Campo>
          </Seccion>

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

// ─── Métodos de pago ──────────────────────────────────────────────────
// Lista + alta/edición/baja de los métodos que el bot ofrece y con los que
// reconoce los cobros. Vive dentro de Configuración (mismo molde "Sereno").

function MetodosPago() {
  const [items, setItems] = useState<MetodoPago[] | null>(null);
  const [error, setError] = useState("");
  const [cargaFallida, setCargaFallida] = useState(false);
  const [form, setForm] = useState<FormMetodo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [conmutando, setConmutando] = useState<number | null>(null);

  function recargar() {
    setError("");
    setCargaFallida(false);
    getMetodosPago()
      .then((d) => {
        setItems(d);
        setError("");
      })
      .catch((e: Error) => {
        setError(e.message);
        if (items === null) setCargaFallida(true);
      });
  }
  useEffect(recargar, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar el modal con Escape (no cierra mientras guarda).
  useEffect(() => {
    if (!form) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !guardando) setForm(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, guardando]);

  function abrirNuevo() {
    setForm({ ...FORM_METODO_VACIO });
  }

  function abrirEditar(m: MetodoPago) {
    setForm({
      id: m.id,
      tipo: m.tipo || "Pago Móvil",
      titulo: m.titulo ?? "",
      titular: m.titular ?? "",
      banco: m.banco ?? "",
      telefono: m.telefono ?? "",
      cedula: m.cedula ?? "",
      cuenta: m.cuenta ?? "",
      correo: m.correo ?? "",
      wallet: m.wallet ?? "",
      instrucciones: m.instrucciones ?? "",
      activo: m.activo,
    });
  }

  async function guardar() {
    if (!form || !form.titulo.trim()) return;
    setGuardando(true);
    setError("");
    // Solo enviamos los campos relevantes al tipo (los demás van vacíos).
    const relevantes = camposDeTipo(form.tipo);
    const body: Partial<MetodoPago> = {
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      activo: form.activo,
      titular: relevantes.includes("titular") ? form.titular.trim() || null : null,
      banco: relevantes.includes("banco") ? form.banco.trim() || null : null,
      telefono: relevantes.includes("telefono") ? form.telefono.trim() || null : null,
      cedula: relevantes.includes("cedula") ? form.cedula.trim() || null : null,
      cuenta: relevantes.includes("cuenta") ? form.cuenta.trim() || null : null,
      correo: relevantes.includes("correo") ? form.correo.trim() || null : null,
      wallet: relevantes.includes("wallet") ? form.wallet.trim() || null : null,
      instrucciones: relevantes.includes("instrucciones") ? form.instrucciones.trim() || null : null,
    };
    try {
      if (form.id) await actualizarMetodoPago(form.id, body);
      else await crearMetodoPago(body);
      setForm(null);
      recargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(m: MetodoPago) {
    if (!window.confirm(`¿Eliminar el método "${m.titulo}"? El bot dejará de ofrecerlo.`)) return;
    setError("");
    try {
      await borrarMetodoPago(m.id);
      recargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function conmutarActivo(m: MetodoPago) {
    setConmutando(m.id);
    setError("");
    try {
      await actualizarMetodoPago(m.id, { activo: !m.activo });
      recargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConmutando(null);
    }
  }

  const campos = form ? camposDeTipo(form.tipo) : [];

  // Helper para mostrar el dato clave de cada método en su fila.
  function valoresClave(m: MetodoPago): string {
    return camposDeTipo(m.tipo)
      .map((c) => (m[c as keyof MetodoPago] as string | null | undefined))
      .filter((v): v is string => !!v && v.toString().trim().length > 0)
      .join(" · ");
  }

  return (
    <section className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold num-snug text-fg">Métodos de pago</h2>
          <p className="mt-1 text-sm font-medium leading-relaxed text-fg-muted">
            Estos son los métodos que el bot ofrece y con los que reconoce tus pagos.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Agregar método
        </button>
      </div>

      {items !== null && <ErrorBanner mensaje={error} />}

      <div className="mt-4">
        {items === null && cargaFallida ? (
          <ErrorState mensaje={error} onRetry={recargar} />
        ) : items === null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-subtle ring-hair" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-xl bg-bg-subtle/50 px-4 py-6 text-center text-sm font-medium text-fg-muted ring-hair">
            Aún no hay métodos de pago. Agrega el primero para que el bot pueda cobrar.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((m) => {
              const clave = valoresClave(m);
              return (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-4 rounded-xl bg-bg-subtle/40 px-4 py-3 ring-hair"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/15">
                      <Wallet className="h-[18px] w-[18px]" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="font-bold text-fg">
                        {m.titulo}
                        <span className="ml-2 align-middle text-[12px] font-semibold text-fg-muted">
                          {m.tipo}
                        </span>
                      </p>
                      {clave && (
                        <p className="mt-1 truncate text-[13px] font-medium text-fg-muted">{clave}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => conmutarActivo(m)}
                      disabled={conmutando === m.id}
                      role="switch"
                      aria-checked={m.activo}
                      aria-label={m.activo ? "Desactivar método" : "Activar método"}
                      title={m.activo ? "Activo (clic para desactivar)" : "Inactivo (clic para activar)"}
                      className={`focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                        m.activo ? "bg-accent" : "bg-borde"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          m.activo ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => abrirEditar(m)}
                      className="focus-ring rounded-lg p-1.5 text-fg-muted transition hover:bg-bg-subtle hover:text-fg"
                      title="Editar"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={() => borrar(m)}
                      className="focus-ring rounded-lg p-1.5 text-fg-muted transition hover:bg-red-50 hover:text-red-600"
                      title="Eliminar"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => !guardando && setForm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="metodo-modal-titulo"
            className="w-full max-w-md rounded-2xl bg-bg p-6 shadow-soft ring-hair"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="metodo-modal-titulo" className="text-lg font-semibold num-snug text-fg">
                {form.id ? "Editar método" : "Agregar método"}
              </h3>
              <button
                onClick={() => setForm(null)}
                className="focus-ring rounded-lg p-1 text-fg-muted transition hover:bg-bg-subtle hover:text-fg"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3.5 overflow-y-auto pr-1">
              <div>
                <label htmlFor="metodo-tipo" className="mb-1 block text-[12px] font-semibold text-fg-muted">
                  Tipo
                </label>
                <select
                  id="metodo-tipo"
                  className={inputCls}
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  {TIPOS_METODO.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.key}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="metodo-titulo" className="mb-1 block text-[12px] font-semibold text-fg-muted">
                  Título
                </label>
                <input
                  id="metodo-titulo"
                  className={inputCls}
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej. Pago Móvil Banesco"
                />
              </div>

              {campos.includes("banco") && (
                <CampoModal label={ETIQUETA_CAMPO.banco} id="metodo-banco">
                  <input
                    className={inputCls}
                    value={form.banco}
                    onChange={(e) => setForm({ ...form, banco: e.target.value })}
                  />
                </CampoModal>
              )}
              {campos.includes("cuenta") && (
                <CampoModal label={ETIQUETA_CAMPO.cuenta} id="metodo-cuenta">
                  <input
                    className={inputCls}
                    value={form.cuenta}
                    onChange={(e) => setForm({ ...form, cuenta: e.target.value })}
                    placeholder="Número de cuenta (ej. 01340188851881028171)"
                  />
                </CampoModal>
              )}
              {campos.includes("telefono") && (
                <CampoModal label={ETIQUETA_CAMPO.telefono} id="metodo-telefono">
                  <input
                    className={inputCls}
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </CampoModal>
              )}
              {campos.includes("cedula") && (
                <CampoModal label={ETIQUETA_CAMPO.cedula} id="metodo-cedula">
                  <input
                    className={inputCls}
                    value={form.cedula}
                    onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  />
                </CampoModal>
              )}
              {campos.includes("titular") && (
                <CampoModal label={ETIQUETA_CAMPO.titular} id="metodo-titular">
                  <input
                    className={inputCls}
                    value={form.titular}
                    onChange={(e) => setForm({ ...form, titular: e.target.value })}
                  />
                </CampoModal>
              )}
              {campos.includes("correo") && (
                <CampoModal label={ETIQUETA_CAMPO.correo} id="metodo-correo">
                  <input
                    className={inputCls}
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </CampoModal>
              )}
              {campos.includes("wallet") && (
                <CampoModal
                  label={form.tipo === "Binance" ? "ID de Binance (UID)" : ETIQUETA_CAMPO.wallet}
                  id="metodo-wallet"
                >
                  <input
                    className={inputCls}
                    value={form.wallet}
                    onChange={(e) => setForm({ ...form, wallet: e.target.value })}
                    placeholder={form.tipo === "Binance" ? "Ej. 326103739" : ""}
                  />
                </CampoModal>
              )}
              {campos.includes("instrucciones") && (
                <CampoModal label={ETIQUETA_CAMPO.instrucciones} id="metodo-instrucciones">
                  <textarea
                    className={`${inputCls} resize-y`}
                    rows={3}
                    value={form.instrucciones}
                    onChange={(e) => setForm({ ...form, instrucciones: e.target.value })}
                    placeholder="Cómo debe pagar el cliente con este método."
                  />
                </CampoModal>
              )}

              <label className="flex items-center gap-2 pt-1 text-sm font-medium text-fg">
                <input
                  type="checkbox"
                  className="focus-ring h-4 w-4 rounded border-borde text-accent"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                Activo (el bot lo ofrece)
              </label>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setForm(null)}
                disabled={guardando}
                className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-bg px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !form.titulo.trim()}
                className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Campo del modal de métodos (label + control). Usa id explícito porque varios
// controles comparten el mismo molde dentro del diálogo.
function CampoModal({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12px] font-semibold text-fg-muted">
        {label}
      </label>
      {React.cloneElement(children, { id })}
    </div>
  );
}
