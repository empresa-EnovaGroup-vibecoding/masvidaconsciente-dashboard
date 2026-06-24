"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X, FileText, Upload, Trash2, Package } from "lucide-react";
import {
  getProductos,
  crearProducto,
  editarProducto,
  getCatalogoPdf,
  subirCatalogoPdf,
  borrarCatalogoPdf,
  borrarProducto,
  type Producto,
  type ProductoInput,
} from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { inputCls } from "@/lib/ui";

const ORDEN = ["panaderia", "dulceria", "congelados", "artesanal", "harinas"];
const TITULO: Record<string, string> = {
  panaderia: "Panadería",
  dulceria: "Dulcería",
  congelados: "Congelados",
  artesanal: "Artesanal",
  harinas: "Harinas",
};

type FormState = {
  id?: number;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: string;
  presentacion: string;
  duracion: string;
  se_congela: string;
  apto_diabeticos: string;
  info: string;
  disponible: boolean;
};

const FORM_VACIO: FormState = {
  nombre: "",
  categoria: "panaderia",
  descripcion: "",
  precio: "",
  presentacion: "",
  duracion: "",
  se_congela: "",
  apto_diabeticos: "",
  info: "",
  disponible: true,
};

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [pdfTiene, setPdfTiene] = useState<boolean | null>(null);
  const [pdfOcupado, setPdfOcupado] = useState(false);

  function recargar() {
    setError("");
    getProductos().then(setProductos).catch((e) => setError(e.message));
  }

  useEffect(() => {
    recargar();
    getCatalogoPdf()
      .then((r) => setPdfTiene(r.tiene))
      .catch(() => setPdfTiene(false));
  }, []);

  // Cierra el modal con la tecla Escape (no mientras se guarda).
  useEffect(() => {
    if (!form) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !guardando) setForm(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, guardando]);

  async function onPdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPdfOcupado(true);
    setError("");
    try {
      await subirCatalogoPdf(file);
      setPdfTiene(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPdfOcupado(false);
    }
  }

  async function quitarPdf() {
    if (!window.confirm("¿Quitar el catálogo PDF? El bot dejará de poder enviarlo.")) return;
    setPdfOcupado(true);
    try {
      await borrarCatalogoPdf();
      setPdfTiene(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPdfOcupado(false);
    }
  }

  const rank = (c: string) => {
    const i = ORDEN.indexOf(c);
    return i === -1 ? 99 : i;
  };
  const categorias = productos
    ? Array.from(new Set(productos.map((p) => p.categoria || "otros"))).sort(
        (a, b) => rank(a) - rank(b),
      )
    : [];

  function abrirNuevo() {
    setForm({ ...FORM_VACIO });
  }

  function abrirEditar(p: Producto) {
    setForm({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria || "panaderia",
      descripcion: p.descripcion || "",
      precio: p.precio !== null ? String(p.precio) : "",
      presentacion: p.presentacion || "",
      duracion: p.duracion || "",
      se_congela: p.se_congela || "",
      apto_diabeticos: p.apto_diabeticos || "",
      info: p.info || "",
      disponible: p.disponible,
    });
  }

  async function toggleDisponible(p: Producto) {
    setOcupado(p.id);
    const datos: ProductoInput = {
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion,
      precio: p.precio,
      presentacion: p.presentacion,
      duracion: p.duracion,
      se_congela: p.se_congela,
      apto_diabeticos: p.apto_diabeticos,
      info: p.info,
      disponible: !p.disponible,
    };
    try {
      await editarProducto(p.id, datos);
      setProductos((prev) =>
        prev ? prev.map((x) => (x.id === p.id ? { ...x, disponible: !x.disponible } : x)) : prev,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  async function eliminar(p: Producto) {
    if (
      !window.confirm(
        `¿Eliminar "${p.nombre}" del catálogo? Si solo quieres ocultarlo por ahora (y quizá venderlo después), usa "Agotado". Esto no afecta pedidos anteriores, pero no se puede deshacer.`,
      )
    )
      return;
    setOcupado(p.id);
    setError("");
    try {
      await borrarProducto(p.id);
      setProductos((prev) => (prev ? prev.filter((x) => x.id !== p.id) : prev));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  async function guardar() {
    if (!form || !form.nombre.trim()) return;
    let precio: number | null = null;
    if (form.precio.trim() !== "") {
      const n = Number(form.precio);
      if (!Number.isFinite(n) || n <= 0) {
        setError("El precio debe ser un número mayor que 0. Déjalo vacío si quieres que diga \"consultar\".");
        return;
      }
      precio = n;
    }
    setGuardando(true);
    setError("");
    const datos: ProductoInput = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      descripcion: form.descripcion.trim() || null,
      precio,
      presentacion: form.presentacion.trim() || null,
      duracion: form.duracion.trim() || null,
      se_congela: form.se_congela.trim() || null,
      apto_diabeticos: form.apto_diabeticos.trim() || null,
      info: form.info.trim() || null,
      disponible: form.disponible,
    };
    try {
      if (form.id) await editarProducto(form.id, datos);
      else await crearProducto(datos);
      setForm(null);
      recargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Catálogo</h1>
          <p className="mt-1 text-[15px] font-medium text-fg-muted">
            Los productos que el bot ofrece a tus clientes
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nuevo producto
        </button>
      </header>

      {/* Catálogo en PDF (el folleto que el bot envía) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-bg p-6 shadow-card ring-hair">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/15">
            <FileText className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Catálogo en PDF</p>
            <p className="mt-0.5 text-[13px] font-medium text-fg-muted">
              {pdfTiene === null
                ? "…"
                : pdfTiene
                  ? "Cargado. El bot lo envía cuando un cliente pide ver el catálogo."
                  : "Sube tu folleto en PDF y el bot lo enviará cuando se lo pidan."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <label
            className={`focus-ring inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft ${
              pdfOcupado ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Upload className="h-4 w-4" strokeWidth={2} />
            {pdfOcupado ? "Subiendo…" : pdfTiene ? "Reemplazar" : "Subir PDF"}
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={onPdfSelect}
              disabled={pdfOcupado}
            />
          </label>
          {pdfTiene && (
            <button
              onClick={quitarPdf}
              disabled={pdfOcupado}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-bg px-4 py-2.5 text-sm font-semibold text-red-600 ring-1 ring-red-600/20 transition hover:bg-red-50 disabled:opacity-50"
              title="Quitar"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              Quitar
            </button>
          )}
        </div>
      </div>

      {productos !== null && <ErrorBanner mensaje={error} />}

      {error && productos === null ? (
        <ErrorState mensaje={error} onRetry={recargar} />
      ) : productos === null ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <EmptyState
          icon={Package}
          titulo="Aún no hay productos"
          texto='Agrega el primero con "Nuevo producto".'
        />
      ) : (
        categorias.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="mb-3 text-lg font-semibold num-snug text-fg">
              {TITULO[cat] || cat}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {productos
                .filter((p) => (p.categoria || "otros") === cat)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-2xl bg-bg p-6 shadow-card ring-hair transition ${
                      p.disponible ? "" : "opacity-60"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-fg">{p.nombre}</p>
                      <span className="shrink-0 text-sm font-bold text-accent num-snug tnum">
                        {p.precio !== null ? formatUSD(p.precio) : "consultar"}
                      </span>
                    </div>
                    {p.presentacion && (
                      <p className="mt-0.5 text-[12px] font-medium text-fg-faint">{p.presentacion}</p>
                    )}
                    {p.descripcion && (
                      <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-relaxed text-fg-muted">
                        {p.descripcion}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 border-t border-borde/60 pt-3">
                      <button
                        onClick={() => toggleDisponible(p)}
                        disabled={ocupado === p.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-50 ${
                          p.disponible
                            ? "bg-accent/10 text-accent ring-accent/15 hover:bg-accent/15"
                            : "bg-red-50 text-red-700 ring-red-600/15 hover:bg-red-100"
                        }`}
                      >
                        {p.disponible ? "Disponible" : "Agotado"}
                      </button>
                      <button
                        onClick={() => abrirEditar(p)}
                        className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-fg-muted transition hover:text-fg"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(p)}
                        disabled={ocupado === p.id}
                        title="Eliminar producto"
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Eliminar
                      </button>
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalogo-modal-titulo"
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-bg shadow-soft ring-hair"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between p-6 pb-4">
              <h2 id="catalogo-modal-titulo" className="text-lg font-semibold num-snug text-fg">
                {form.id ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button
                onClick={() => setForm(null)}
                aria-label="Cerrar"
                className="focus-ring rounded-lg p-1 text-fg-muted transition hover:text-fg"
              >
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>

            <div className="flex-1 space-y-3.5 overflow-y-auto px-6 pb-1">
              <Campo label="Nombre" htmlFor="prod-nombre">
                <input
                  id="prod-nombre"
                  className={inputCls}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Pan integral"
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Categoría" htmlFor="prod-categoria">
                  <select
                    id="prod-categoria"
                    className={inputCls}
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  >
                    {!ORDEN.includes(form.categoria) && (
                      <option value={form.categoria}>{TITULO[form.categoria] ?? form.categoria}</option>
                    )}
                    {ORDEN.map((c) => (
                      <option key={c} value={c}>
                        {TITULO[c]}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Precio (USD)" htmlFor="prod-precio">
                  <input
                    id="prod-precio"
                    className={inputCls}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    placeholder="0.00"
                  />
                </Campo>
              </div>

              <Campo label="Presentación" htmlFor="prod-presentacion">
                <input
                  id="prod-presentacion"
                  className={inputCls}
                  value={form.presentacion}
                  onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
                  placeholder="Ej. Bolsa de 500g"
                />
              </Campo>

              <Campo label="Descripción" htmlFor="prod-descripcion">
                <textarea
                  id="prod-descripcion"
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Ingredientes, beneficios..."
                />
              </Campo>

              <div className="space-y-3.5 border-t border-borde/60 pt-3.5">
                <p className="text-[12px] font-semibold text-fg">
                  Información para el bot
                  <span className="ml-1 font-normal text-fg-faint">
                    (datos de ESTE producto; el bot no los mezcla con otros)
                  </span>
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Duración" htmlFor="prod-duracion">
                    <input
                      id="prod-duracion"
                      className={inputCls}
                      value={form.duracion}
                      onChange={(e) => setForm({ ...form, duracion: e.target.value })}
                      placeholder="Ej. 1 mes en nevera"
                    />
                  </Campo>
                  <Campo label="¿Se congela?" htmlFor="prod-congela">
                    <input
                      id="prod-congela"
                      className={inputCls}
                      value={form.se_congela}
                      onChange={(e) => setForm({ ...form, se_congela: e.target.value })}
                      placeholder="Ej. Sí, hasta 2 meses"
                    />
                  </Campo>
                </div>
                <Campo label="¿Apto para diabéticos?" htmlFor="prod-diabeticos">
                  <input
                    id="prod-diabeticos"
                    className={inputCls}
                    value={form.apto_diabeticos}
                    onChange={(e) => setForm({ ...form, apto_diabeticos: e.target.value })}
                    placeholder="Ej. Sí, con alulosa"
                  />
                </Campo>
                <Campo label="Más información" htmlFor="prod-info">
                  <textarea
                    id="prod-info"
                    className={`${inputCls} resize-none`}
                    rows={3}
                    value={form.info}
                    onChange={(e) => setForm({ ...form, info: e.target.value })}
                    placeholder="Alérgenos, variaciones, cualquier dato del producto…"
                  />
                </Campo>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-sm font-medium text-fg">
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => setForm({ ...form, disponible: e.target.checked })}
                  className="h-4 w-4 rounded accent-accent"
                />
                Disponible para la venta
              </label>
            </div>

            <div className="flex shrink-0 gap-2 p-6 pt-4">
              <button
                onClick={() => setForm(null)}
                disabled={guardando}
                className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-bg px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !form.nombre.trim()}
                className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
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

function Campo({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-medium text-fg-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
