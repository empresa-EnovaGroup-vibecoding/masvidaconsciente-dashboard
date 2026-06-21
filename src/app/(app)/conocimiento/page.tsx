"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Lightbulb } from "lucide-react";
import {
  getConocimiento,
  crearConocimiento,
  editarConocimiento,
  borrarConocimiento,
  type Conocimiento,
  type ConocimientoInput,
} from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { inputCls } from "@/lib/ui";

const CATEGORIAS = [
  { key: "faq", label: "Preguntas frecuentes" },
  { key: "productos", label: "Productos / Ingredientes" },
  { key: "horarios", label: "Horarios" },
  { key: "politicas", label: "Políticas (envíos, devoluciones)" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "empresa", label: "Sobre el negocio" },
];
const LABEL: Record<string, string> = Object.fromEntries(CATEGORIAS.map((c) => [c.key, c.label]));

type FormState = { id?: number; categoria: string; titulo: string; contenido: string };
const FORM_VACIO: FormState = { categoria: "faq", titulo: "", contenido: "" };

export default function ConocimientoPage() {
  const [items, setItems] = useState<Conocimiento[] | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [guardando, setGuardando] = useState(false);

  function recargar() {
    setError("");
    getConocimiento()
      .then((d) => {
        setItems(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }
  useEffect(recargar, []);

  // Cerrar el modal con la tecla Escape (no cierra mientras guarda).
  useEffect(() => {
    if (!form) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !guardando) setForm(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, guardando]);

  const categorias = items
    ? CATEGORIAS.filter((c) => items.some((i) => (i.categoria || "faq") === c.key)).concat(
        // categorías "otras" que no estén en la lista fija
        Array.from(new Set(items.map((i) => i.categoria || "faq")))
          .filter((k) => !CATEGORIAS.some((c) => c.key === k))
          .map((k) => ({ key: k, label: k })),
      )
    : [];

  async function guardar() {
    if (!form || !form.titulo.trim() || !form.contenido.trim()) return;
    setGuardando(true);
    setError("");
    const datos: ConocimientoInput = {
      categoria: form.categoria,
      titulo: form.titulo.trim(),
      contenido: form.contenido.trim(),
    };
    try {
      if (form.id) await editarConocimiento(form.id, datos);
      else await crearConocimiento(datos);
      setForm(null);
      recargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(id: number) {
    if (!window.confirm("¿Borrar esta entrada del conocimiento del bot?")) return;
    setError("");
    try {
      await borrarConocimiento(id);
      recargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Conocimiento del negocio</h1>
          <p className="mt-1 text-[15px] font-medium text-fg-muted">
            Lo que el bot usa para responder dudas. Mientras más cargues aquí, menos improvisa.
          </p>
        </div>
        <button
          onClick={() => setForm({ ...FORM_VACIO })}
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nueva entrada
        </button>
      </header>

      {items !== null && <ErrorBanner mensaje={error} />}

      {items === null && error ? (
        <ErrorState mensaje={error} onRetry={recargar} />
      ) : items === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          titulo="Aún no hay información cargada"
          texto="Agrega lo que tus clientes preguntan seguido: ingredientes, horarios, envíos…"
        />
      ) : (
        categorias.map((cat) => (
          <section
            key={cat.key}
            className="mb-6 overflow-hidden rounded-2xl bg-bg shadow-card ring-hair"
          >
            <div className="px-6 py-5">
              <h2 className="text-lg font-semibold num-snug text-fg">{cat.label}</h2>
            </div>
            <ul className="divide-y divide-borde/60 border-t border-borde/60">
              {items
                .filter((i) => (i.categoria || "faq") === cat.key)
                .map((i) => (
                  <li
                    key={i.id}
                    className="flex items-start justify-between gap-4 px-6 py-4 transition-colors hover:bg-bg-subtle/50"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/15">
                        <Lightbulb className="h-[18px] w-[18px]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="font-bold text-fg">{i.titulo}</p>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-fg-muted">
                          {i.contenido}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() =>
                          setForm({
                            id: i.id,
                            categoria: i.categoria || "faq",
                            titulo: i.titulo,
                            contenido: i.contenido,
                          })
                        }
                        className="focus-ring rounded-lg p-1.5 text-fg-muted transition hover:bg-bg-subtle hover:text-fg"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => borrar(i.id)}
                        className="focus-ring rounded-lg p-1.5 text-fg-muted transition hover:bg-red-50 hover:text-red-600"
                        title="Borrar"
                        aria-label="Borrar"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => !guardando && setForm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conocimiento-modal-titulo"
            className="w-full max-w-md rounded-2xl bg-bg p-6 shadow-soft ring-hair"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="conocimiento-modal-titulo" className="text-lg font-semibold num-snug text-fg">
                {form.id ? "Editar entrada" : "Nueva entrada"}
              </h3>
              <button
                onClick={() => setForm(null)}
                className="focus-ring rounded-lg p-1 text-fg-muted transition hover:bg-bg-subtle hover:text-fg"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="conocimiento-categoria"
                  className="mb-1 block text-[12px] font-semibold text-fg-muted"
                >
                  Categoría
                </label>
                <select
                  id="conocimiento-categoria"
                  className={inputCls}
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  {!CATEGORIAS.some((c) => c.key === form.categoria) && (
                    <option value={form.categoria}>{LABEL[form.categoria] ?? form.categoria}</option>
                  )}
                  {CATEGORIAS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="conocimiento-titulo"
                  className="mb-1 block text-[12px] font-semibold text-fg-muted"
                >
                  Pregunta o título
                </label>
                <input
                  id="conocimiento-titulo"
                  className={inputCls}
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej. ¿Hacen envíos?"
                />
              </div>
              <div>
                <label
                  htmlFor="conocimiento-contenido"
                  className="mb-1 block text-[12px] font-semibold text-fg-muted"
                >
                  Respuesta
                </label>
                <textarea
                  id="conocimiento-contenido"
                  className={`${inputCls} resize-y`}
                  rows={4}
                  value={form.contenido}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  placeholder="Ej. Sí, hacemos delivery en Cabudare. El costo depende de la zona…"
                />
              </div>
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
                disabled={guardando || !form.titulo.trim() || !form.contenido.trim()}
                className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
