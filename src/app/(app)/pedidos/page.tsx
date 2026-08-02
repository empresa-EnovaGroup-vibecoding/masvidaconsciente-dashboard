"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Trash2, MessageCircle, User, Pencil, Plus, X, Check, CalendarClock } from "lucide-react";
import {
  getPedidos,
  cambiarEstadoPedido,
  borrarPedido,
  editarItemsPedido,
  getProductos,
  getPreciosDia,
  type Pedido,
  type Producto,
  type VarianteProducto,
} from "@/lib/api";
import { formatUSD, formatFechaSola } from "@/lib/format";
import { estiloEstado, ESTADOS_PEDIDO_MANUALES } from "@/lib/estados";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { EstadoBadge } from "@/components/estado-badge";

/** Nombres de una lista de líneas, sin repetir: un pedido con dos líneas del mismo producto no
 *  debe imprimir «Torta de chocolate, Torta de chocolate» en un aviso. */
function nombresDe(items: { producto: string }[]): string {
  return [...new Set(items.map((it) => it.producto))].join(", ");
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState("");
  // id del pedido cuya petición está en vuelo (deshabilita SU select/botones).
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  // Los tamaños de PRECIO DEL DÍA no tienen precio en el catálogo: el que vale HOY vive aquí
  // (el mismo dato con el que `_precio_efectivo` cobra). {variante_id: precio_hoy | null}
  const [preciosDia, setPreciosDia] = useState<Record<number, number | null>>({});
  const [editando, setEditando] = useState<number | null>(null);
  const [itemsEdit, setItemsEdit] = useState<
    {
      producto: string;
      variante_id?: number | null;
      cantidad: number;
      opciones?: string | null;
    }[]
  >([]);
  const [guardandoItems, setGuardandoItems] = useState(false);

  function cargar() {
    setError("");
    getPedidos().then(setPedidos).catch((e) => setError(e.message));
  }
  useEffect(() => {
    cargar();
    getProductos().then(setProductos).catch(() => {});
    // Si esta falla, `preciosDia` queda vacío y el editor dice «precio del día» en vez de
    // inventar un número: degradación honesta, nunca una cifra falsa.
    getPreciosDia()
      .then((ps) => setPreciosDia(Object.fromEntries(ps.map((x) => [x.variante_id, x.precio_hoy]))))
      .catch(() => {});
  }, []);

  async function actualizar(id: number, estado: string) {
    setOcupado(id);
    setError("");
    try {
      await cambiarEstadoPedido(id, estado);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
      cargar();
    }
  }

  async function eliminar(p: Pedido) {
    const aviso = p.pago_bloqueante
      ? p.pago_bloqueante === "reportado"
        ? "\n\n⚠️ Tiene un comprobante POR VERIFICAR: al eliminarlo, ese registro se va."
        : "\n\n⚠️ Tiene un pago CONFIRMADO: al eliminarlo, esa venta sale de tus reportes."
      : "";
    if (
      !window.confirm(
        `¿Eliminar el pedido #${p.id}? Esta acción no se puede deshacer.${aviso}`,
      )
    )
      return;
    setOcupado(p.id);
    setError("");
    try {
      await borrarPedido(p.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
      cargar();
    }
  }

  async function cancelar(id: number) {
    if (!window.confirm(`¿Cancelar el pedido #${id}?`)) return;
    await actualizar(id, "cancelado");
  }

  function abrirEditor(p: Pedido) {
    setEditando(p.id);
    // `opciones` se arrastra tal cual: si no, editar el pedido BORRA el relleno del cliente.
    setItemsEdit(
      p.items.map((it) => ({
        producto: it.producto,
        // El TAMAÑO viaja tal cual: sin él, la API no sabría cuál de los tamaños se cobró.
        variante_id: it.variante_id ?? null,
        cantidad: it.cantidad,
        opciones: it.opciones ?? null,
      })),
    );
    setError("");
  }

  /** Los TAMAÑOS de un producto. El <select> guarda el NOMBRE (así se guardó siempre en
   *  `pedido.items`), así que se resuelve por nombre. */
  function variantesDe(nombre: string): VarianteProducto[] {
    return productos.find((pr) => pr.nombre === nombre)?.variantes ?? [];
  }

  /** Qué tamaño se elige SOLO al cambiar de producto: si hay UNO, ese; si hay varios, NINGUNO.
   *  El backend rechaza adivinar (router.py:490-497) y el panel tampoco adivina: el tamaño es
   *  lo que se COBRA (Kombucha 350ml $4 · 700ml $7). */
  function varianteInicial(nombre: string): number | null {
    const vs = variantesDe(nombre);
    return vs.length === 1 ? vs[0].id : null;
  }

  type LineaEdit = { producto: string; variante_id?: number | null };

  /** El TAMAÑO que se está cobrando en esta línea. `undefined` = el panel no lo puede resolver
   *  (falta elegirlo, lo borraron del catálogo, o el producto entero ya no existe). */
  function varianteDe(it: LineaEdit): VarianteProducto | undefined {
    const vs = variantesDe(it.producto);
    if (it.variante_id != null) return vs.find((v) => v.id === it.variante_id);
    return vs.length === 1 ? vs[0] : undefined;
  }

  /** Producto de varios tamaños al que todavía no se le eligió uno. No es que falte el precio:
   *  falta la ELECCIÓN, y el <select> de tamaño de al lado ya la está pidiendo. */
  function faltaTamano(it: LineaEdit): boolean {
    return it.variante_id == null && variantesDe(it.producto).length > 1;
  }

  /** Lo que vale un tamaño HOY: el del catálogo o, si es de precio del día, el que la dueña
   *  puso hoy. `null` = todavía no hay precio, y entonces no se pinta ningún número. */
  function precioVariante(v: VarianteProducto): number | null {
    return v.precio ?? preciosDia[v.id] ?? null;
  }

  /**
   * El precio con el que el BACKEND va a cobrar esta línea (`_precio_efectivo`, tools.py:832):
   * el del TAMAÑO, y si es de precio del día, el de hoy.
   *
   * 🔴 Antes esto leía `Producto.precio`, el campo LEGADO que el propio backend documenta como
   * muerto (router.py:595-597): pintaba $4,00 en una Kombucha que se cobraba a $7,00 y, por un
   * `?? 0`, $0,00 en todo lo de precio del día — las tortas, lo más caro. El número con el que
   * la dueña decidía era FALSO.
   */
  function precioDe(it: LineaEdit): number | null {
    const v = varianteDe(it);
    return v ? precioVariante(v) : null;
  }

  /** Etiqueta de precio del <option> de producto. Mismo criterio: nunca el campo legado. */
  function etiquetaPrecio(pr: Producto): string {
    const vs = pr.variantes ?? [];
    if (vs.length > 1) return ` — ${vs.length} tamaños`;
    const v = vs[0];
    if (!v) return "";
    const precio = precioVariante(v);
    return precio != null ? ` — ${formatUSD(precio)}` : " — precio del día";
  }

  // Subtotal de PRODUCTOS (sin envío). Las líneas sin precio no suman: inventarles un 0 era
  // justo el defecto que se está arreglando, así que se avisan por separado.
  const totalEdit = itemsEdit.reduce((s, it) => s + (precioDe(it) ?? 0) * it.cantidad, 0);

  /** Tamaños de precio del día a los que HOY nadie les puso precio. El backend responde 400
   *  (router.py:505-512): decirlo antes ahorra el error y explica por qué el total va corto. */
  const sinPrecioHoy = itemsEdit.filter(
    (it) => it.producto.trim() && varianteDe(it) != null && precioDe(it) == null,
  );

  /** Líneas que el PANEL no sabe valorar aunque el backend sí sepa cobrarlas: el tamaño que se
   *  cobró ya no está en el catálogo, o el producto entero fue borrado — el backend cobra por
   *  `variante_id` (router.py:459-475) y guardar funciona. No se bloquea nada, pero se dice: el
   *  «Total estimado» sale CORTO y hasta hoy salía corto en silencio. */
  const sinTarifa = itemsEdit.filter(
    (it) => it.producto.trim() && !faltaTamano(it) && varianteDe(it) == null,
  );

  async function guardarItems(id: number) {
    const limpios = itemsEdit
      .filter((it) => it.producto.trim())
      .map((it) => ({
        producto: it.producto,
        variante_id: it.variante_id ?? null,
        cantidad: Math.max(1, Math.floor(it.cantidad || 1)),
        opciones: it.opciones ?? null,
      }));
    if (limpios.length === 0) {
      setError("El pedido debe tener al menos un producto.");
      return;
    }
    // EL TAMAÑO NO SE ADIVINA. El backend responde 400 («Elige el tamaño en el pedido antes de
    // guardar», router.py:490-497) y hasta hoy ese error no se podía resolver desde la pantalla.
    // Se avisa aquí, nombrando el producto, sin gastar la petición.
    const sinTamano = limpios.find((it) => faltaTamano(it));
    if (sinTamano) {
      setError(`Elige el tamaño de «${sinTamano.producto}» antes de guardar.`);
      return;
    }
    // Y no se anuncia un total que ya se sabe incompleto: sin precio de hoy, `totalEdit` deja
    // esas líneas fuera y el guardado va a dar 400 igual (router.py:505-512). Antes del confirm.
    if (sinPrecioHoy.length > 0) {
      setError(
        `Falta el precio de hoy de ${nombresDe(sinPrecioHoy)}. ` +
          "Ponlo en «El bot te necesita» y vuelve: sin él no se puede guardar.",
      );
      return;
    }
    const p = pedidos?.find((x) => x.id === id);
    if (p?.pago_bloqueante) {
      const envio = p.costo_envio ?? 0;
      const nuevo = totalEdit + envio;
      const quePago =
        p.pago_bloqueante === "confirmado"
          ? "un pago CONFIRMADO"
          : p.pago_bloqueante === "parcial"
            ? "un pago PARCIAL"
            : "un comprobante POR VERIFICAR";
      // El flete NO se recalcula: va congelado en el pedido y el backend lo vuelve a sumar
      // (router.py:531-532). Decirlo evita que la dueña crea que se le fue en el cambio.
      const lineaEnvio =
        envio > 0
          ? `\nEl envío${p.zona_nombre ? ` (${p.zona_nombre})` : ""} se mantiene en ${formatUSD(envio)}: no cambia.`
          : "";
      // El aviso viejo («el total puede no cuadrar») no decía NINGUNA cifra, aunque el panel
      // tiene las dos; ni distinguía qué clase de pago hay, aunque `eliminar()` sí lo hace.
      // Pero si hay líneas que el panel no sabe valorar, `nuevo` va CORTO: anunciarlo como exacto
      // sería la misma mentira que se está arreglando, así que ahí se dice que no se puede.
      const lineaTotal =
        sinTarifa.length > 0
          ? `El total de ahora es ${formatUSD(p.total_usd)}. El nuevo no te lo puedo calcular: ` +
            `de ${nombresDe(sinTarifa)} ya no está en tu catálogo el producto o el tamaño que se vendió.`
          : `El total pasa de ${formatUSD(p.total_usd)} a ${formatUSD(nuevo)}.`;
      if (
        !window.confirm(
          `Este pedido ya tiene ${quePago}.\n\n` +
            lineaTotal +
            lineaEnvio +
            "\n\nSi no coincide con lo que pagó el cliente, tendrás que cobrarle la diferencia " +
            "o devolvérsela.\nAdemás, la cotización que el bot le dio queda anulada: si vuelve " +
            "a escribir, cotizará de nuevo.\n\n¿Guardar igual?",
        )
      )
        return;
    }
    setGuardandoItems(true);
    setError("");
    try {
      await editarItemsPedido(id, limpios);
      setEditando(null);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardandoItems(false);
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Pedidos</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">Todos los pedidos de tus clientes</p>
      </header>

      {pedidos !== null && <ErrorBanner mensaje={error} />}

      {error && pedidos === null ? (
        <ErrorState mensaje={error} onRetry={cargar} />
      ) : pedidos === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          titulo="Aún no hay pedidos"
          texto="Cuando un cliente ordene por WhatsApp, aparecerá aquí."
        />
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const est = estiloEstado(p.estado);
            return (
              <div key={p.id} className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                      {(p.nombre || p.cliente || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-fg">{p.nombre || p.cliente}</p>
                      <p className="text-xs font-medium text-fg-muted tnum">
                        {p.nombre ? `${p.cliente} · ` : ""}Pedido #{p.id}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs font-semibold">
                        <a
                          href={`https://wa.me/${(p.cliente || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring inline-flex items-center gap-1 rounded-md text-fg-muted transition hover:text-accent"
                        >
                          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                          Abrir WhatsApp
                        </a>
                        <a
                          href="/clientes"
                          className="focus-ring inline-flex items-center gap-1 rounded-md text-fg-muted transition hover:text-accent"
                        >
                          <User className="h-3.5 w-3.5" strokeWidth={2} />
                          Ver ficha
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold num-snug text-fg tnum">{formatUSD(p.total_usd)}</p>
                    <div className="mt-1">
                      <EstadoBadge estado={p.estado} />
                    </div>
                  </div>
                </div>

                {editando === p.id ? (
                  <div className="mb-4 space-y-2 rounded-xl bg-bg-subtle/50 p-3 ring-hair">
                    {itemsEdit.map((it, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label="Producto"
                          value={it.producto}
                          onChange={(e) =>
                            setItemsEdit((arr) =>
                              arr.map((x, j) =>
                                j === i
                                  ? {
                                      ...x,
                                      producto: e.target.value,
                                      // 🔴 EL TAMAÑO DEL PRODUCTO ANTERIOR NO VALE PARA EL NUEVO.
                                      // Antes solo se reescribía el nombre y el `variante_id`
                                      // viejo seguía viajando: el backend tuvo que aprender a
                                      // descartarlo (router.py:461-475). Lo limpio es no mandarlo.
                                      variante_id: varianteInicial(e.target.value),
                                    }
                                  : x,
                              ),
                            )
                          }
                          className="focus-ring min-w-0 flex-1 rounded-lg bg-bg px-2.5 py-2 text-[13px] text-fg ring-1 ring-borde"
                        >
                          {it.producto && !productos.some((pr) => pr.nombre === it.producto) && (
                            <option value={it.producto}>{it.producto}</option>
                          )}
                          {productos.map((pr) => (
                            <option key={pr.id} value={pr.nombre}>
                              {pr.nombre}
                              {etiquetaPrecio(pr)}
                              {pr.disponible ? "" : " (agotado)"}
                            </option>
                          ))}
                        </select>
                        {/* EL TAMAÑO ES LO QUE SE COBRA. Sin este selector, agregar un producto
                            con varios tamaños devolvía un 400 («Elige el tamaño en el pedido
                            antes de guardar») que la pantalla no dejaba resolver: callejón sin
                            salida. Con UN solo tamaño ni aparece (ya está resuelto). */}
                        {variantesDe(it.producto).length > 1 && (
                          <select
                            aria-label="Tamaño"
                            value={it.variante_id ?? ""}
                            onChange={(e) =>
                              setItemsEdit((arr) =>
                                arr.map((x, j) =>
                                  j === i
                                    ? {
                                        ...x,
                                        variante_id: e.target.value ? Number(e.target.value) : null,
                                      }
                                    : x,
                                ),
                              )
                            }
                            className="focus-ring w-40 shrink-0 rounded-lg bg-bg px-2.5 py-2 text-[13px] text-fg ring-1 ring-borde"
                          >
                            <option value="">Elige el tamaño…</option>
                            {/* Si el tamaño que se cobró ya no está en el catálogo (lo borraron),
                                se conserva su id: el <select> no puede MENTIR mostrando otro. */}
                            {it.variante_id != null &&
                              !variantesDe(it.producto).some((v) => v.id === it.variante_id) && (
                                <option value={it.variante_id}>Tamaño anterior (ya no está)</option>
                              )}
                            {variantesDe(it.producto).map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.presentacion}
                                {precioVariante(v) != null
                                  ? ` — ${formatUSD(precioVariante(v))}`
                                  : " — precio del día"}
                                {v.disponible ? "" : " (agotado)"}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="number"
                          min={1}
                          aria-label="Cantidad"
                          value={it.cantidad}
                          onChange={(e) =>
                            setItemsEdit((arr) =>
                              arr.map((x, j) =>
                                j === i ? { ...x, cantidad: Number(e.target.value) } : x,
                              ),
                            )
                          }
                          className="focus-ring w-16 rounded-lg bg-bg px-2 py-2 text-center text-[13px] text-fg ring-1 ring-borde tnum"
                        />
                        <button
                          type="button"
                          aria-label="Quitar producto"
                          onClick={() => setItemsEdit((arr) => arr.filter((_, j) => j !== i))}
                          className="focus-ring rounded-lg p-2 text-fg-muted transition hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setItemsEdit((arr) => [
                          ...arr,
                          {
                            producto: productos[0]?.nombre ?? "",
                            // Nace con su tamaño resuelto si el producto tiene uno solo.
                            variante_id: varianteInicial(productos[0]?.nombre ?? ""),
                            cantidad: 1,
                          },
                        ])
                      }
                      className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-accent transition hover:bg-accent/10"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} /> Agregar producto
                    </button>
                    <div className="space-y-1 border-t border-borde pt-2 text-[13px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg-muted">Productos</span>
                        <span className="font-bold text-fg tnum">{formatUSD(totalEdit)}</span>
                      </div>
                      {/* EL FLETE NO SE TOCA AQUÍ y el backend lo vuelve a sumar
                          (router.py:531-532). Mostrarlo es lo que hace el total AUDITABLE:
                          antes solo había una fila y parecía que editar se comía el envío. */}
                      {(p.costo_envio ?? 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-fg-muted">
                            Envío{p.zona_nombre ? ` · ${p.zona_nombre}` : ""} (no cambia)
                          </span>
                          <span className="font-bold text-fg tnum">
                            {formatUSD(p.costo_envio ?? 0)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-borde/60 pt-1">
                        <span className="font-semibold text-fg">Total estimado</span>
                        <span className="font-extrabold text-fg tnum">
                          {formatUSD(totalEdit + (p.costo_envio ?? 0))}
                        </span>
                      </div>
                    </div>
                    {sinPrecioHoy.length > 0 && (
                      <p className="text-[12px] font-semibold text-amber-600">
                        Falta el precio de hoy de {nombresDe(sinPrecioHoy)}. Ponlo en «El bot te
                        necesita» y vuelve aquí: sin él no se puede guardar.
                      </p>
                    )}
                    {sinTarifa.length > 0 && (
                      <p className="text-[12px] font-semibold text-amber-600">
                        De {nombresDe(sinTarifa)} ya no está en tu catálogo el producto o el tamaño
                        que se vendió, así que el total de arriba no lo incluye. Guardar sí
                        funciona (se cobra el tamaño que se vendió), pero la cifra se queda corta.
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={guardandoItems}
                        onClick={() => guardarItems(p.id)}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" strokeWidth={2} />
                        {guardandoItems ? "Guardando…" : "Guardar cambios"}
                      </button>
                      <button
                        type="button"
                        disabled={guardandoItems}
                        onClick={() => setEditando(null)}
                        className="focus-ring rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                    <p className="text-[12px] font-medium text-fg-faint">
                      Los productos se recalculan con el precio de cada tamaño (el del día, si lo
                      tiene). El envío no se toca: queda como está y se vuelve a sumar al total. Si
                      este pedido ya tiene un pago, revisa que el monto siga cuadrando.
                    </p>
                  </div>
                ) : (
                  <ul className="mb-4 space-y-1 text-[13px] text-fg-muted">
                    {p.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-fg">
                          <span className="tnum">{it.cantidad}×</span> {it.producto}
                          {it.presentacion && (
                            <span className="text-fg-muted"> (paquete de {it.presentacion})</span>
                          )}
                          {it.opciones && (
                            <span className="block text-[12px] font-medium text-accent">
                              {it.opciones}
                            </span>
                          )}
                        </span>
                        {it.precio_unitario != null && (
                          <span className="tnum">{formatUSD(it.precio_unitario)}</span>
                        )}
                      </li>
                    ))}
                    {/* PRODUCTOS + ENVÍO = el total de la cabecera. Sin estas filas el pedido
                        decía $23,00, los ítems sumaban $20,00 y no había NADA que explicara los
                        otros $3,00. Las dos cifras vienen del backend (`subtotal_productos` y
                        `costo_envio`): aquí NO se multiplica ni se suma nada — el panel no
                        calcula dinero, lo muestra. */}
                    {(p.zona_nombre || (p.costo_envio ?? 0) > 0) && (
                      <li className="border-t border-borde/60 pt-1">
                        {p.subtotal_productos != null && (
                          <div className="flex justify-between gap-3">
                            <span className="text-fg">Productos</span>
                            <span className="tnum">{formatUSD(p.subtotal_productos)}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-3">
                          <span className="text-fg">
                            {(p.costo_envio ?? 0) > 0 ? "Envío" : "Retiro"}
                            {p.zona_nombre ? ` · ${p.zona_nombre}` : ""}
                          </span>
                          <span className="tnum">{formatUSD(p.costo_envio ?? 0)}</span>
                        </div>
                      </li>
                    )}
                  </ul>
                )}

                {/* PARA CUÁNDO es. Antes no se guardaba: llegaba un pedido de $42 sin saber
                    para qué día era, y el bot llegó a prometer domingos (que no se entrega).
                    La FECHA se pinta con `formatFechaSola`, NUNCA con `formatFecha`:
                    `entrega_fecha` es un "2026-08-05" pelado y `new Date()` lo lee como
                    medianoche UTC — en Venezuela saldría el día ANTERIOR. Es la fecha que se le
                    prometió al cliente; equivocarla por un día cuesta la venta. */}
                {(p.entrega || p.entrega_fecha) && (
                  <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-accent">
                    <CalendarClock className="h-4 w-4" strokeWidth={2} />
                    Entrega: {p.entrega || "—"}
                    {p.entrega_fecha && (
                      <span className="font-medium text-fg-muted tnum">
                        ({formatFechaSola(p.entrega_fecha)})
                      </span>
                    )}
                  </p>
                )}

                {p.notas && <p className="mb-4 text-[13px] italic text-fg-muted">Nota: {p.notas}</p>}

                {editando !== p.id && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Cambiar estado del pedido"
                      value={p.estado}
                      disabled={ocupado === p.id}
                      onChange={(e) => actualizar(p.id, e.target.value)}
                      className="focus-ring rounded-xl bg-bg px-3 py-2 text-[13px] text-fg ring-1 ring-borde transition hover:bg-bg-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {!ESTADOS_PEDIDO_MANUALES.includes(p.estado) && (
                        <option value={p.estado} disabled>
                          {est.label}
                        </option>
                      )}
                      {ESTADOS_PEDIDO_MANUALES.map((e) => (
                        <option key={e} value={e}>
                          {estiloEstado(e).label}
                        </option>
                      ))}
                    </select>

                    {p.estado !== "cancelado" && (
                      <button
                        type="button"
                        disabled={ocupado === p.id}
                        onClick={() => abrirEditor(p)}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-bg px-3 py-2 text-[13px] font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-bg-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                        Editar
                      </button>
                    )}

                    {p.estado !== "cancelado" && (
                      <button
                        type="button"
                        disabled={ocupado === p.id}
                        onClick={() => cancelar(p.id)}
                        className="focus-ring rounded-xl bg-bg px-3 py-2 text-[13px] font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-bg-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={ocupado === p.id}
                      onClick={() => eliminar(p)}
                      aria-label={`Eliminar pedido #${p.id}`}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-red-600 ring-1 ring-red-600/20 transition hover:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
