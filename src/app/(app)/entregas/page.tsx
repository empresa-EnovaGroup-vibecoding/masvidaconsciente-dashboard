"use client";

/**
 * ENTREGAS — dónde entregas y cuánto cobras por llevarlo.
 *
 * 🔴 POR QUÉ ESTA PANTALLA EXISTE (caso real, 2026-07-13): una clienta quería un producto de $20
 * con delivery y el bot le escribió *"El total en bolívares es de $23 USD"* — sumó los $3 del
 * envío DE CABEZA, llamó bolívares a unos dólares, y no registró ningún pedido.
 *
 * La regla estaba escrita en su personalidad, DOS VECES ("no sumes el envío al total") y la
 * ignoró. Lección: **lo que mueve DINERO no puede vivir en un texto** (ni en la personalidad ni
 * en Conocimiento: eso el bot lo lee y lo cuenta como quiere). Vive AQUÍ, en casillas con número.
 * El bot ya no ESCRIBE el envío: lo ELIGE de esta lista, y el CÓDIGO lo suma al total.
 */

import { useCallback, useEffect, useState } from "react";
import { Truck, Home, Plus, Trash2, Save } from "lucide-react";
import {
  getZonas,
  crearZona,
  guardarZona,
  borrarZona,
  type Zona,
  type ZonaIn,
} from "@/lib/api";
import { inputCls } from "@/lib/ui";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";

const VACIA: ZonaIn = {
  nombre: "",
  costo: 0,
  referencias: "",
  es_retiro: false,
  disponible: true,
  orden: 99,
};

export default function EntregasPage() {
  const [zonas, setZonas] = useState<Zona[] | null>(null);
  const [nueva, setNueva] = useState<ZonaIn>(VACIA);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState<number | "nueva" | null>(null);

  const cargar = useCallback(async () => {
    try {
      setZonas(await getZonas());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las zonas");
      setZonas(null);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function agregar() {
    if (!nueva.nombre.trim()) return;
    setGuardando("nueva");
    try {
      await crearZona({ ...nueva, nombre: nueva.nombre.trim() });
      setNueva(VACIA);
      await cargar();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la zona");
    } finally {
      setGuardando(null);
    }
  }

  async function guardar(z: Zona) {
    setGuardando(z.id);
    try {
      const { id: _id, ...datos } = z;
      await guardarZona(z.id, datos);
      await cargar();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  }

  async function eliminar(z: Zona) {
    const ok = window.confirm(
      `¿Borrar «${z.nombre}»?\n\nEl bot dejará de ofrecerla. Los pedidos que ya la usaron NO se ` +
        `tocan: conservan su zona y su costo.`,
    );
    if (!ok) return;
    try {
      await borrarZona(z.id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  function editar(id: number, campo: keyof Zona, valor: unknown) {
    setZonas((zs) =>
      zs ? zs.map((z) => (z.id === id ? { ...z, [campo]: valor } : z)) : zs,
    );
  }

  if (zonas === null && error) {
    return <ErrorState mensaje={error} onRetry={() => void cargar()} />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-2">
        <h1 className="text-3xl font-bold text-fg">Entregas</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Dónde entregas y cuánto cobras por llevarlo. El bot <strong>no inventa</strong> el envío:
          lo escoge de esta lista y el sistema lo <strong>suma solo</strong> al total.
        </p>
      </header>

      <div className="mb-6 rounded-xl bg-bg-subtle px-4 py-3 text-sm text-fg-muted ring-1 ring-inset ring-borde">
        Si un cliente te dice un sitio que <strong>no está en esta lista</strong>, el bot{" "}
        <strong>no adivina</strong>: le lee tus zonas y le pregunta en cuál está. Si aun así no
        calza, <strong>te avisa a ti</strong>. Y si cambias un precio, los pedidos que ya se
        hicieron <strong>no cambian</strong>.
      </div>

      {error && <ErrorBanner mensaje={error} />}

      {/* ── Las zonas que ya tienes ── */}
      <div className="space-y-3">
        {(zonas ?? []).map((z) => (
          <div
            key={z.id}
            className="rounded-2xl bg-bg-elev p-4 ring-1 ring-borde"
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <label className="mb-1 block text-xs font-medium text-fg-muted">Zona</label>
                <input
                  className={inputCls}
                  value={z.nombre}
                  onChange={(e) => editar(z.id, "nombre", e.target.value)}
                />
              </div>

              <div className="w-32">
                <label className="mb-1 block text-xs font-medium text-fg-muted">
                  Cuánto cobras
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-faint">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    className={`${inputCls} pl-7`}
                    value={z.costo}
                    disabled={z.es_retiro}
                    onChange={(e) => editar(z.id, "costo", Number(e.target.value))}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pb-2 text-sm text-fg-muted">
                <input
                  type="checkbox"
                  checked={z.es_retiro}
                  onChange={(e) => {
                    editar(z.id, "es_retiro", e.target.checked);
                    if (e.target.checked) editar(z.id, "costo", 0);
                  }}
                />
                <Home className="h-4 w-4" />
                Lo retira (gratis)
              </label>

              <label className="flex items-center gap-2 pb-2 text-sm text-fg-muted">
                <input
                  type="checkbox"
                  checked={z.disponible}
                  onChange={(e) => editar(z.id, "disponible", e.target.checked)}
                />
                Activa
              </label>

              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => void guardar(z)}
                  disabled={guardando === z.id}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-bg-subtle hover:text-fg disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {guardando === z.id ? "Guardando…" : "Guardar"}
                </button>
                <button
                  onClick={() => void eliminar(z)}
                  aria-label={`Borrar ${z.nombre}`}
                  className="focus-ring rounded-xl px-3 py-2 text-sm text-fg-muted ring-1 ring-borde hover:text-rojo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Barrios o sitios que entran aquí{" "}
                <span className="text-fg-faint">
                  (para que el bot no se equivoque de zona — ej: El Ujano, Obelisco…)
                </span>
              </label>
              <input
                className={inputCls}
                placeholder="Escribe los sitios separados por comas"
                value={z.referencias ?? ""}
                onChange={(e) => editar(z.id, "referencias", e.target.value)}
              />
            </div>
          </div>
        ))}

        {zonas !== null && zonas.length === 0 && (
          <div className="rounded-2xl bg-bg-elev p-8 text-center ring-1 ring-borde">
            <Truck className="mx-auto mb-3 h-8 w-8 text-fg-faint" />
            <p className="text-sm text-fg-muted">
              Todavía no tienes zonas. Mientras no las cargues, el bot{" "}
              <strong>no puede cobrar delivery</strong>: te va a avisar a ti.
            </p>
          </div>
        )}
      </div>

      {/* ── Agregar una zona nueva ── */}
      <div className="mt-6 rounded-2xl bg-bg-elev p-4 ring-1 ring-borde">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
          <Plus className="h-4 w-4" />
          Agregar una zona
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs font-medium text-fg-muted">Zona</label>
            <input
              className={inputCls}
              placeholder="Ej: Cabudare centro"
              value={nueva.nombre}
              onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
            />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-fg-muted">Cuánto cobras</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-faint">
                $
              </span>
              <input
                type="number"
                min={0}
                step="0.5"
                className={`${inputCls} pl-7`}
                value={nueva.costo}
                disabled={nueva.es_retiro}
                onChange={(e) => setNueva({ ...nueva, costo: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={nueva.es_retiro}
              onChange={(e) =>
                setNueva({
                  ...nueva,
                  es_retiro: e.target.checked,
                  costo: e.target.checked ? 0 : nueva.costo,
                })
              }
            />
            <Home className="h-4 w-4" />
            Lo retira (gratis)
          </label>
          <button
            onClick={() => void agregar()}
            disabled={!nueva.nombre.trim() || guardando === "nueva"}
            className="focus-ring ml-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-bg-subtle hover:text-fg disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {guardando === "nueva" ? "Agregando…" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
