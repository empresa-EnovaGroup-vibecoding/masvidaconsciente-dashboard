"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X, FileText, Upload, Trash2, Package } from "lucide-react";
import {
  getProductos,
  crearProducto,
  editarProducto,
  marcarAgotado,
  crearVariante,
  editarVariante,
  borrarVariante,
  type VarianteProducto,
  getCatalogoPdf,
  subirCatalogoPdf,
  borrarCatalogoPdf,
  borrarProducto,
  getMediaProducto,
  subirMediaProducto,
  borrarMedia,
  type Producto,
  type ProductoInput,
  type ProductoMedia,
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
  dias_anticipacion: string;
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
  dias_anticipacion: "0",
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
  const [media, setMedia] = useState<ProductoMedia[]>([]);
  const [subiendoMedia, setSubiendoMedia] = useState(false);
  // LOS TAMAÑOS del producto que se está editando. El precio vive AQUÍ.
  const [tamanos, setTamanos] = useState<VarianteProducto[]>([]);
  const [nuevoTam, setNuevoTam] = useState({ presentacion: "", precio: "", sabores: "" });
  const [tamOcupado, setTamOcupado] = useState(false);
  const variosTamanos = tamanos.length > 1;

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
    setMedia([]);
    setTamanos([]);
    setNuevoTam({ presentacion: "", precio: "", sabores: "" });
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
      dias_anticipacion: String(p.dias_anticipacion ?? 0),
      se_congela: p.se_congela || "",
      apto_diabeticos: p.apto_diabeticos || "",
      info: p.info || "",
      disponible: p.disponible,
    });
    setMedia([]);
    setTamanos(p.variantes ?? []);
    setNuevoTam({ presentacion: "", precio: "", sabores: "" });
    getMediaProducto(p.id)
      .then(setMedia)
      .catch(() => setMedia([]));
  }

  // ─── LOS TAMAÑOS (lo que se COBRA) ───────────────────────────────
  function refrescarTamanos(productoId: number) {
    getProductos()
      .then((ps) => setTamanos(ps.find((x) => x.id === productoId)?.variantes ?? []))
      .catch(() => {});
    recargar();
  }

  async function agregarTamano() {
    if (!form?.id) return;
    const pres = nuevoTam.presentacion.trim();
    if (!pres) {
      setError("Ponle un nombre al tamaño (ej. 700ml, 1kg).");
      return;
    }
    const precio = nuevoTam.precio.trim() === "" ? null : Number(nuevoTam.precio);
    if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
      setError("El precio de ese tamaño no es válido.");
      return;
    }
    setTamOcupado(true);
    setError("");
    try {
      await crearVariante(form.id, {
        presentacion: pres,
        precio,
        sabores: nuevoTam.sabores.trim() || null,
        disponible: true,
        orden: tamanos.length,
      });
      setNuevoTam({ presentacion: "", precio: "", sabores: "" });
      refrescarTamanos(form.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTamOcupado(false);
    }
  }

  async function guardarTamano(v: VarianteProducto, cambios: Partial<VarianteProducto>) {
    if (!form?.id) return;
    setTamOcupado(true);
    setError("");
    try {
      const nuevo = { ...v, ...cambios };
      await editarVariante(v.id, {
        presentacion: nuevo.presentacion,
        precio: nuevo.precio,
        sabores: nuevo.sabores,
        disponible: nuevo.disponible,
        orden: nuevo.orden,
      });
      refrescarTamanos(form.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTamOcupado(false);
    }
  }

  async function quitarTamano(v: VarianteProducto) {
    if (!form?.id) return;
    if (!window.confirm(`¿Quitar el tamaño "${v.presentacion}"?`)) return;
    setTamOcupado(true);
    setError("");
    try {
      await borrarVariante(v.id);
      refrescarTamanos(form.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTamOcupado(false);
    }
  }

  async function toggleDisponible(p: Producto) {
    setOcupado(p.id);
    // Endpoint PROPIO: solo toca "agotado". Antes esto reconstruía el producto ENTERO y lo
    // mandaba de vuelta: bastaba olvidar un campo para que un clic en "Agotado" lo BORRARA de
    // la base. Y con los tamaños sería peor: mandaba un `precio` que el backend ya rechaza en
    // los productos de varios tamaños → marcar agotada la Kombucha habría FALLADO.
    try {
      await marcarAgotado(p.id, !p.disponible);
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

  async function onMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !form?.id) return;
    setSubiendoMedia(true);
    setError("");
    try {
      for (const file of files) {
        const nueva = await subirMediaProducto(form.id, file);
        setMedia((prev) => [...prev, nueva]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubiendoMedia(false);
      recargar(); // refresca la miniatura en la tarjeta del catálogo
    }
  }

  async function eliminarMedia(id: number) {
    try {
      await borrarMedia(id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
      recargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function guardar() {
    if (!form || !form.nombre.trim()) return;
    let precio: number | null = null;
    // 🔴 Con VARIOS tamaños el precio NO se manda desde aquí: vive en cada tamaño y el servidor
    // (con razón) rechaza el intento. Pero el valor viejo seguía guardado por dentro aunque la
    // casilla ya no se viera en pantalla, así que se enviaba igual y CUALQUIER cambio del
    // producto (hasta borrar una línea de la descripción) fallaba... en silencio.
    if (!variosTamanos && form.precio.trim() !== "") {
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
      dias_anticipacion: Math.max(0, Math.floor(Number(form.dias_anticipacion) || 0)),
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
                    {p.imagen && (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="mb-3 h-32 w-full rounded-xl object-cover ring-1 ring-borde/60"
                      />
                    )}
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-fg">{p.nombre}</p>
                      <span className="shrink-0 text-sm font-bold text-accent num-snug tnum">
                        {(p.variantes?.length ?? 0) > 1
                          ? `${p.variantes!.length} tamaños`
                          : p.variantes?.[0]?.precio != null
                            ? formatUSD(p.variantes[0].precio!)
                            : p.precio !== null
                              ? formatUSD(p.precio)
                              : "precio del día"}
                      </span>
                    </div>
                    {(p.variantes?.length ?? 0) > 1 ? (
                      <p className="mt-0.5 flex flex-wrap gap-1 text-[12px] font-medium text-fg-faint">
                        {p.variantes!.map((v) => (
                          <span
                            key={v.id}
                            className="rounded-md bg-bg-subtle px-1.5 py-0.5 ring-1 ring-borde tnum"
                          >
                            {v.presentacion} {v.precio != null ? formatUSD(v.precio) : "precio del día"}
                          </span>
                        ))}
                      </p>
                    ) : p.presentacion && (
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
                {variosTamanos ? (
                  <Campo label="Precio (USD)" htmlFor="prod-precio">
                    <p className="rounded-xl bg-bg-subtle px-3 py-2.5 text-[13px] font-medium text-fg-muted ring-1 ring-inset ring-borde">
                      Este producto tiene varios tamaños y{" "}
                      <span className="font-semibold text-fg">cada uno tiene su precio</span>.
                      Edítalos abajo, en Tamaños.
                    </p>
                  </Campo>
                ) : (
                  <Campo label="Precio (USD)" htmlFor="prod-precio">
                    <input
                      id="prod-precio"
                      className={inputCls}
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      placeholder="Déjalo vacío si el precio cambia cada día"
                    />
                  </Campo>
                )}
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
                  <Campo
                    label="Días de anticipación"
                    htmlFor="prod-anticipacion"
                    ayuda="Cuántos días necesitas para prepararlo. 0 = puede salir el mismo día (si tienes). El bot NO lo va a prometer para antes."
                  >
                    <input
                      id="prod-anticipacion"
                      type="number"
                      min={0}
                      max={30}
                      className={inputCls}
                      value={form.dias_anticipacion}
                      onChange={(e) => setForm({ ...form, dias_anticipacion: e.target.value })}
                      placeholder="0"
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

              <div className="space-y-2 border-t border-borde/60 pt-3.5">
                {/* LOS TAMAÑOS. El precio vive aquí: la Kombucha de 350ml cuesta $4 y la
                    de 700ml $7. Antes había que crear DOS productos con el mismo nombre, y el
                    bot cobraba siempre el del primero. */}
                {form.id && (
                  <div className="rounded-2xl bg-bg-subtle p-4 ring-1 ring-borde">
                    <p className="text-[12px] font-semibold text-fg">Tamaños y precios</p>
                    <p className="mt-0.5 text-[12px] font-medium text-fg-muted">
                      Cada tamaño tiene <span className="font-semibold">su precio y sus sabores</span>.
                      Escríbelos aquí, <span className="font-semibold">no en la descripción</span>: si
                      el mismo dato vive en dos sitios, un día cambias uno y el bot lee el otro. Si el
                      precio cambia de un día a otro, déjalo vacío: te lo preguntará en «El bot te
                      necesita».
                    </p>

                    <ul className="mt-3 space-y-3">
                      {tamanos.map((v) => (
                        <li
                          key={v.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl bg-bg p-2 ring-1 ring-borde/60"
                        >
                          <input
                            className={`${inputCls} h-9 w-28 shrink-0`}
                            defaultValue={v.presentacion}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== v.presentacion)
                                void guardarTamano(v, { presentacion: val });
                            }}
                            aria-label="Nombre del tamaño"
                          />
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="text-[13px] font-medium text-fg-muted">$</span>
                            <input
                              className={`${inputCls} h-9 w-24 tnum`}
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={v.precio ?? ""}
                              placeholder="del día"
                              onBlur={(e) => {
                                const t = e.target.value.trim();
                                const nuevo = t === "" ? null : Number(t);
                                if (nuevo !== v.precio) void guardarTamano(v, { precio: nuevo });
                              }}
                              aria-label="Precio del tamaño"
                            />
                          </div>
                          {/* LOS SABORES SON DEL TAMAÑO. La kombucha de 700ml tiene cúrcuma y
                              flor de jamaica; la de 350ml, no. Van AQUÍ y NO en la descripción:
                              un dato, un solo lugar. Si estuvieran en los dos sitios, un día
                              cambiaría uno y el bot leería el otro. */}
                          <input
                            className={`${inputCls} h-9 flex-1 min-w-40`}
                            defaultValue={v.sabores ?? ""}
                            placeholder="Sabores de ESTE tamaño (ej. parchita, limón, cúrcuma)"
                            onBlur={(e) => {
                              const val = e.target.value.trim() || null;
                              if (val !== (v.sabores ?? null))
                                void guardarTamano(v, { sabores: val });
                            }}
                            aria-label="Sabores del tamaño"
                          />
                          <button
                            type="button"
                            disabled={tamOcupado}
                            onClick={() => void guardarTamano(v, { disponible: !v.disponible })}
                            className={`focus-ring rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 transition disabled:opacity-50 ${
                              v.disponible
                                ? "bg-bg text-fg-muted ring-borde hover:bg-bg-subtle"
                                : "bg-warn-bg text-warn ring-warn-border"
                            }`}
                          >
                            {v.disponible ? "Disponible" : "Agotado"}
                          </button>
                          <button
                            type="button"
                            disabled={tamOcupado || tamanos.length <= 1}
                            onClick={() => void quitarTamano(v)}
                            title={
                              tamanos.length <= 1
                                ? "No puedes quitar el único tamaño: el producto quedaría sin precio"
                                : "Quitar este tamaño"
                            }
                            className="focus-ring rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-red-600 ring-1 ring-red-600/20 transition hover:bg-red-50 disabled:opacity-30"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-borde/60 pt-3">
                      <input
                        className={`${inputCls} h-9 flex-1 min-w-28`}
                        value={nuevoTam.presentacion}
                        onChange={(e) =>
                          setNuevoTam({ ...nuevoTam, presentacion: e.target.value })
                        }
                        placeholder="Otro tamaño (ej. 700ml, 1kg)"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-fg-muted">$</span>
                        <input
                          className={`${inputCls} h-9 w-24 tnum`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={nuevoTam.precio}
                          onChange={(e) => setNuevoTam({ ...nuevoTam, precio: e.target.value })}
                          placeholder="del día"
                        />
                      </div>
                      <input
                        className={`${inputCls} h-9 flex-1 min-w-40`}
                        value={nuevoTam.sabores}
                        onChange={(e) => setNuevoTam({ ...nuevoTam, sabores: e.target.value })}
                        placeholder="Sabores de ese tamaño (opcional)"
                      />
                      <button
                        type="button"
                        disabled={tamOcupado}
                        onClick={() => void agregarTamano()}
                        className="focus-ring rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
                      >
                        Agregar tamaño
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[12px] font-semibold text-fg">Fotos y videos</p>
                {form.id ? (
                  <>
                    {media.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {media.map((m) => (
                          <div
                            key={m.id}
                            className="group relative aspect-square overflow-hidden rounded-lg ring-hair"
                          >
                            {m.tipo === "video" ? (
                              <video src={m.url} className="h-full w-full object-cover" muted />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.url} alt="" className="h-full w-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => eliminarMedia(m.id)}
                              aria-label="Eliminar"
                              className="absolute right-1 top-1 rounded-md bg-black/55 p-1 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label
                      className={`focus-ring inline-flex cursor-pointer items-center gap-2 rounded-xl bg-bg px-3 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle ${
                        subiendoMedia ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      <Upload className="h-4 w-4" strokeWidth={1.8} />
                      {subiendoMedia ? "Subiendo…" : "Agregar foto o video"}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={onMediaSelect}
                        disabled={subiendoMedia}
                      />
                    </label>
                    <p className="text-[11px] text-fg-faint">
                      Fotos hasta 5 MB · videos MP4 hasta 16 MB (límite de WhatsApp).
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] text-fg-faint">
                    Guarda el producto primero para poder agregarle fotos y videos.
                  </p>
                )}
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

            {/* EL ERROR, DENTRO de la ventana. Antes salía DETRÁS (en el fondo de la página):
                le dabas a Guardar, no pasaba nada y no había forma de saber por qué. */}
            {error && (
              <div className="mx-6 mb-1 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </div>
            )}

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
  ayuda,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  /** Una línea que explica el campo. La dueña no es técnica: cada campo se explica solo. */
  ayuda?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-medium text-fg-muted">
        {label}
      </label>
      {children}
      {ayuda && <p className="mt-1 text-[11px] font-medium text-fg-faint">{ayuda}</p>}
    </div>
  );
}
