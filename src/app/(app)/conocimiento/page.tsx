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
    getConocimiento()
      .then((d) => {
        setItems(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }
  useEffect(recargar, []);

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
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Conocimiento del negocio</h1>
          <p className="text-sm text-fg-muted mt-1">
            Lo que el bot usa para responder dudas. Mientras más cargues aquí, menos improvisa.
          </p>
        </div>
        <button
          onClick={() => setForm({ ...FORM_VACIO })}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nueva entrada
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-bg border border-borde animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-borde bg-bg p-12 text-center">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-bg-subtle flex items-center justify-center mb-4">
            <Lightbulb className="h-5 w-5 text-fg-muted/60" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-fg">Aún no hay información cargada</p>
          <p className="text-sm text-fg-muted mt-1">
            Agrega lo que tus clientes preguntan seguido: ingredientes, horarios, envíos…
          </p>
        </div>
      ) : (
        categorias.map((cat) => (
          <section key={cat.key} className="mb-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted/70 mb-3">
              {cat.label}
            </h2>
            <div className="space-y-2">
              {items
                .filter((i) => (i.categoria || "faq") === cat.key)
                .map((i) => (
                  <div key={i.id} className="bg-bg rounded-2xl border border-borde p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">{i.titulo}</p>
                        <p className="text-[13px] text-fg-muted mt-1 leading-relaxed whitespace-pre-wrap">
                          {i.contenido}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            setForm({
                              id: i.id,
                              categoria: i.categoria || "faq",
                              titulo: i.titulo,
                              contenido: i.contenido,
                            })
                          }
                          className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                        <button
                          onClick={() => borrar(i.id)}
                          className="p-1.5 rounded-lg text-fg-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Borrar"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))
      )}

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => !guardando && setForm(null)}
        >
          <div
            className="w-full max-w-md bg-bg rounded-2xl border border-borde shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-fg">
                {form.id ? "Editar entrada" : "Nueva entrada"}
              </h3>
              <button onClick={() => setForm(null)} className="text-fg-muted hover:text-fg">
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-fg-muted mb-1">Categoría</label>
                <select
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
                <label className="block text-[12px] font-medium text-fg-muted mb-1">
                  Pregunta o título
                </label>
                <input
                  className={inputCls}
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej. ¿Hacen envíos?"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-fg-muted mb-1">Respuesta</label>
                <textarea
                  className={`${inputCls} resize-y`}
                  rows={4}
                  value={form.contenido}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  placeholder="Ej. Sí, hacemos delivery en Cabudare. El costo depende de la zona…"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setForm(null)}
                disabled={guardando}
                className="flex-1 rounded-lg border border-borde text-sm font-medium text-fg-muted py-2 hover:bg-bg-subtle transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !form.titulo.trim() || !form.contenido.trim()}
                className="flex-1 rounded-lg bg-accent text-white text-sm font-medium py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
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

const inputCls =
  "w-full rounded-lg border border-borde bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent";
