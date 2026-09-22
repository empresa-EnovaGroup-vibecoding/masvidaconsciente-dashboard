"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Lightbulb, Power } from "lucide-react";
import {
  getConocimiento,
  getProductos,
  crearConocimiento,
  editarConocimiento,
  borrarConocimiento,
  activarConocimiento,
  type Conocimiento,
  type ConocimientoInput,
} from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { inputCls } from "@/lib/ui";

// La clave "productos" NO se saca aunque los ingredientes ya no vayan aquí: hay filas guardadas
// con ese valor y su sección se titularía con la clave cruda. Se renombra para que se lea como lo
// que es —lo antiguo— y se agrega "insumos", donde la 030 archiva la masa madre.
const CATEGORIAS = [
  { key: "faq", label: "Preguntas frecuentes" },
  { key: "horarios", label: "Horarios" },
  { key: "politicas", label: "Políticas (envíos, devoluciones)" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "insumos", label: "Insumos compartidos (masa madre, endulzantes…)" },
  { key: "empresa", label: "Sobre el negocio" },
  { key: "productos", label: "Productos (antiguo — los ingredientes van en Catálogo)" },
];
const LABEL: Record<string, string> = Object.fromEntries(CATEGORIAS.map((c) => [c.key, c.label]));

type FormState = { id?: number; categoria: string; titulo: string; contenido: string;
  tema_confirmado: string; producto_id: number | null; confirmado: boolean };
const FORM_VACIO: FormState = { categoria: "faq", titulo: "", contenido: "",
  tema_confirmado: "", producto_id: null, confirmado: false };
const TEMAS = { ingredientes: "Ingredientes", alergenos: "Alérgenos", conservacion: "Conservación",
  envio_nacional: "Envíos nacionales", politica: "Otra política del negocio" };

export default function ConocimientoPage() {
  const [productos, setProductos] = useState<{ id: number; nombre: string }[]>([]);
  useEffect(() => { getProductos().then(setProductos).catch((e) => setError(e.message)); }, []);
  const [items, setItems] = useState<Conocimiento[] | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState<number | null>(null);

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
      tema_confirmado: form.tema_confirmado || null,
      producto_id: form.producto_id,
      confirmado: form.confirmado,
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

  // Retirar = el bot deja de verla, pero el texto QUEDA (y vuelve con otro clic). No recarga la
  // lista entera: parchea la fila en memoria para que no se mueva de sitio bajo el ratón.
  async function alternarActivo(i: Conocimiento) {
    const nuevo = i.activo === false;
    setOcupado(i.id);
    setError("");
    try {
      await activarConocimiento(i.id, nuevo);
      setItems((prev) => (prev ? prev.map((x) => (x.id === i.id ? { ...x, activo: nuevo } : x)) : prev));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
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
            Revisa el tema y confirma cada respuesta para que Alejandra pueda usarla.
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
                    className={`flex items-start justify-between gap-4 px-6 py-4 transition-colors hover:bg-bg-subtle/50 ${
                      i.activo === false ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/15">
                        <Lightbulb className="h-[18px] w-[18px]" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="font-bold text-fg">{i.titulo}</p>
                        <p className="text-xs text-fg-muted">{i.confirmado ? "Respuesta confirmada" : "Pendiente de revisión: Alejandra consultará contigo"}</p>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-fg-muted">
                          {i.contenido}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {/* `i.activo === false`, nunca `!i.activo`: con una API vieja el campo llega
                          undefined y TODO se pintaría como retirado. */}
                      <button
                        onClick={() => alternarActivo(i)}
                        disabled={ocupado === i.id}
                        className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-50 ${
                          i.activo === false
                            ? "bg-bg-subtle text-fg-muted ring-borde"
                            : "bg-accent/10 text-accent ring-accent/15 hover:bg-accent/15"
                        }`}
                        title={i.activo === false ? "El bot NO la usa. Clic para reactivarla." : "El bot la usa. Clic para retirarla sin borrarla."}
                      >
                        <Power className="h-3.5 w-3.5" strokeWidth={2} />
                        {i.activo === false ? "Retirada" : i.confirmado ? "El bot la usa" : "Guardada"}
                      </button>
                      <button
                        onClick={() =>
                          setForm({
                            id: i.id,
                            categoria: i.categoria || "faq",
                            titulo: i.titulo,
                            contenido: i.contenido,
                            tema_confirmado: i.tema_confirmado || "",
                            producto_id: i.producto_id ?? null,
                            confirmado: i.confirmado === true,
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
                <label htmlFor="tema-confirmado" className="mb-1 block text-sm">De qué trata esta respuesta</label>
                <select id="tema-confirmado" className={inputCls} value={form.tema_confirmado}
                  onChange={(e) => setForm({ ...form, tema_confirmado: e.target.value, confirmado: false })}>
                  <option value="">Elige el tema</option>
                  {Object.entries(TEMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="producto-confirmado" className="mb-1 block text-sm">A qué producto corresponde</label>
                <select id="producto-confirmado" className={inputCls} value={form.producto_id ?? ""}
                  onChange={(e) => setForm({ ...form, producto_id: e.target.value ? Number(e.target.value) : null, confirmado: false })}>
                  <option value="">Al negocio en general</option>
                  {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.confirmado} disabled={!form.tema_confirmado}
                  onChange={(e) => setForm({ ...form, confirmado: e.target.checked })} />
                Revisé esta respuesta y autorizo que Alejandra la use.
              </label>
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
                <p className="mb-2 mt-1.5 text-[12px] font-medium leading-relaxed text-fg-muted">
                  Escribe el DATO, no la orden. Bien: «La alulosa no cambia el precio». Mal: «Di algo
                  como que no…» — el bot puede terminar leyéndolo tal cual. Y si es un dato de UN
                  producto (de qué es, cuánto dura), va en su ficha en Catálogo: si el mismo dato
                  vive en dos sitios, un día cambias uno y el bot lee el otro.
                </p>
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
