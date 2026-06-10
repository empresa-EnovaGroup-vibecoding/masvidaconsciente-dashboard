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
};

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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Configuración del negocio</h1>
        <p className="text-sm text-fg-muted mt-1">
          Los datos que el bot usa para atender y cobrar. Se aplican al instante.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {datos === null ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-bg border border-borde animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    <section className="bg-bg rounded-2xl border border-borde p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-fg mb-1">{titulo}</h2>
      {nota && <p className="text-[12px] text-fg-muted mb-4 leading-relaxed">{nota}</p>}
      <div className={`space-y-3 ${nota ? "" : "mt-3"}`}>{children}</div>
    </section>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-fg-muted mb-1">{label}</label>
      {children}
    </div>
  );
}
