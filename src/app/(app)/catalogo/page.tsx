"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X, FileText, Upload, Trash2 } from "lucide-react";
import {
  getProductos,
  crearProducto,
  editarProducto,
  getCatalogoPdf,
  subirCatalogoPdf,
  borrarCatalogoPdf,
  type Producto,
  type ProductoInput,
} from "@/lib/api";

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
  disponible: boolean;
};

const FORM_VACIO: FormState = {
  nombre: "",
  categoria: "panaderia",
  descripcion: "",
  precio: "",
  presentacion: "",
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
    getProductos().then(setProductos).catch((e) => setError(e.message));
  }

  useEffect(() => {
    recargar();
    getCatalogoPdf()
      .then((r) => setPdfTiene(r.tiene))
      .catch(() => setPdfTiene(false));
  }, []);

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

  async function guardar() {
    if (!form || !form.nombre.trim()) return;
    setGuardando(true);
    const datos: ProductoInput = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      descripcion: form.descripcion.trim() || null,
      precio: form.precio.trim() === "" ? null : Number(form.precio),
      presentacion: form.presentacion.trim() || null,
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
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Catálogo</h1>
          <p className="text-sm text-fg-muted mt-1">Los productos que el bot ofrece a tus clientes</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nuevo producto
        </button>
      </header>

      {/* Catálogo en PDF (el folleto que el bot envía) */}
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-borde bg-bg p-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-bg-subtle flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-fg-muted" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">Catálogo en PDF</p>
            <p className="text-[12px] text-fg-muted">
              {pdfTiene === null
                ? "…"
                : pdfTiene
                  ? "Cargado. El bot lo envía cuando un cliente pide ver el catálogo."
                  : "Sube tu folleto en PDF y el bot lo enviará cuando se lo pidan."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label
            className={`inline-flex items-center gap-1.5 text-[13px] font-medium rounded-lg px-3.5 py-2 cursor-pointer bg-accent text-white hover:opacity-90 transition-opacity ${
              pdfOcupado ? "opacity-50 pointer-events-none" : ""
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
              className="p-2 rounded-lg text-fg-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Quitar"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {productos === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-bg border border-borde animate-pulse" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="rounded-2xl border border-borde bg-bg p-12 text-center">
          <p className="text-sm font-medium text-fg">Aún no hay productos</p>
          <p className="text-sm text-fg-muted mt-1">Agrega el primero con &quot;Nuevo producto&quot;.</p>
        </div>
      ) : (
        categorias.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted/70 mb-3">
              {TITULO[cat] || cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {productos
                .filter((p) => (p.categoria || "otros") === cat)
                .map((p) => (
                  <div
                    key={p.id}
                    className={`group bg-bg rounded-2xl border border-borde p-4 shadow-sm transition-all duration-200 ${
                      p.disponible ? "" : "opacity-60"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-fg">{p.nombre}</p>
                      <span className="text-sm font-semibold text-accent tnum shrink-0">
                        {p.precio !== null ? `$${p.precio}` : "consultar"}
                      </span>
                    </div>
                    {p.presentacion && (
                      <p className="text-[12px] text-fg-muted/80 mt-0.5">{p.presentacion}</p>
                    )}
                    {p.descripcion && (
                      <p className="text-[13px] text-fg-muted mt-2 leading-relaxed line-clamp-2">
                        {p.descripcion}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-borde">
                      <button
                        onClick={() => toggleDisponible(p)}
                        disabled={ocupado === p.id}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full ring-1 ring-inset transition-colors disabled:opacity-50 ${
                          p.disponible
                            ? "bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100"
                            : "bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100"
                        }`}
                      >
                        {p.disponible ? "Disponible" : "Agotado"}
                      </button>
                      <button
                        onClick={() => abrirEditar(p)}
                        className="ml-auto inline-flex items-center gap-1 text-[12px] text-fg-muted hover:text-fg transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Editar
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
            className="w-full max-w-md bg-bg rounded-2xl border border-borde shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-fg">
                {form.id ? "Editar producto" : "Nuevo producto"}
              </h3>
              <button onClick={() => setForm(null)} className="text-fg-muted hover:text-fg">
                <X className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>

            <div className="space-y-3.5">
              <Campo label="Nombre">
                <input
                  className={inputCls}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Pan integral"
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Categoría">
                  <select
                    className={inputCls}
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  >
                    {ORDEN.map((c) => (
                      <option key={c} value={c}>
                        {TITULO[c]}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Precio (USD)">
                  <input
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

              <Campo label="Presentación">
                <input
                  className={inputCls}
                  value={form.presentacion}
                  onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
                  placeholder="Ej. Bolsa de 500g"
                />
              </Campo>

              <Campo label="Descripción">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Ingredientes, beneficios..."
                />
              </Campo>

              <label className="flex items-center gap-2.5 text-sm text-fg cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.disponible}
                  onChange={(e) => setForm({ ...form, disponible: e.target.checked })}
                  className="h-4 w-4 rounded accent-[var(--accent,#16a34a)]"
                />
                Disponible para la venta
              </label>
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
                disabled={guardando || !form.nombre.trim()}
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-fg-muted mb-1">{label}</label>
      {children}
    </div>
  );
}
