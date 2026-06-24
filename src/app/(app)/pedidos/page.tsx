"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Trash2, MessageCircle, User, Pencil, Plus, X, Check, Lock } from "lucide-react";
import {
  getPedidos,
  cambiarEstadoPedido,
  borrarPedido,
  editarItemsPedido,
  getProductos,
  type Pedido,
  type Producto,
} from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { estiloEstado, ESTADOS_PEDIDO_MANUALES } from "@/lib/estados";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { EstadoBadge } from "@/components/estado-badge";

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState("");
  // id del pedido cuya petición está en vuelo (deshabilita SU select/botones).
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [itemsEdit, setItemsEdit] = useState<{ producto: string; cantidad: number }[]>([]);
  const [guardandoItems, setGuardandoItems] = useState(false);

  function cargar() {
    setError("");
    getPedidos().then(setPedidos).catch((e) => setError(e.message));
  }
  useEffect(() => {
    cargar();
    getProductos().then(setProductos).catch(() => {});
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

  async function eliminar(id: number) {
    if (
      !window.confirm(
        `¿Eliminar el pedido #${id}? Esta acción no se puede deshacer. ` +
          `Si el pedido tiene un pago, lo recomendable es CANCELARLO, no eliminarlo.`,
      )
    )
      return;
    setOcupado(id);
    setError("");
    try {
      await borrarPedido(id);
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
    setItemsEdit(p.items.map((it) => ({ producto: it.producto, cantidad: it.cantidad })));
    setError("");
  }

  function precioDe(nombre: string): number {
    return productos.find((pr) => pr.nombre === nombre)?.precio ?? 0;
  }

  const totalEdit = itemsEdit.reduce((s, it) => s + precioDe(it.producto) * it.cantidad, 0);

  async function guardarItems(id: number) {
    const limpios = itemsEdit
      .filter((it) => it.producto.trim())
      .map((it) => ({ producto: it.producto, cantidad: Math.max(1, Math.floor(it.cantidad || 1)) }));
    if (limpios.length === 0) {
      setError("El pedido debe tener al menos un producto.");
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
            const bloqueado = !!p.pago_bloqueante;
            const razonBloqueo =
              p.pago_bloqueante === "reportado"
                ? "Tiene un comprobante por verificar: confírmalo o recházalo en Pagos para poder editar o eliminar."
                : "Tiene un pago confirmado: usa Cancelar (no se elimina, para conservar el historial de cobro).";
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
                      <div key={i} className="flex items-center gap-2">
                        <select
                          aria-label="Producto"
                          value={it.producto}
                          onChange={(e) =>
                            setItemsEdit((arr) =>
                              arr.map((x, j) => (j === i ? { ...x, producto: e.target.value } : x)),
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
                              {pr.precio != null ? ` — ${formatUSD(pr.precio)}` : ""}
                              {pr.disponible ? "" : " (agotado)"}
                            </option>
                          ))}
                        </select>
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
                          { producto: productos[0]?.nombre ?? "", cantidad: 1 },
                        ])
                      }
                      className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-accent transition hover:bg-accent/10"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} /> Agregar producto
                    </button>
                    <div className="flex items-center justify-between border-t border-borde pt-2 text-[13px]">
                      <span className="font-semibold text-fg-muted">Total estimado</span>
                      <span className="font-bold text-fg tnum">{formatUSD(totalEdit)}</span>
                    </div>
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
                      El total se recalcula con los precios del catálogo. No se puede editar si el
                      pedido ya tiene un pago confirmado o por verificar.
                    </p>
                  </div>
                ) : (
                  <ul className="mb-4 space-y-1 text-[13px] text-fg-muted">
                    {p.items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="text-fg">
                          <span className="tnum">{it.cantidad}×</span> {it.producto}
                        </span>
                        {it.precio_unitario != null && (
                          <span className="tnum">{formatUSD(it.precio_unitario)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {p.notas && <p className="mb-4 text-[13px] italic text-fg-muted">Nota: {p.notas}</p>}

                {editando !== p.id && (
                  <div className="space-y-2">
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
                          disabled={ocupado === p.id || bloqueado}
                          title={bloqueado ? razonBloqueo : undefined}
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
                        disabled={ocupado === p.id || bloqueado}
                        title={bloqueado ? razonBloqueo : undefined}
                        onClick={() => eliminar(p.id)}
                        aria-label={`Eliminar pedido #${p.id}`}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-red-600 ring-1 ring-red-600/20 transition hover:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        Eliminar
                      </button>
                    </div>
                    {bloqueado && (
                      <p className="flex items-center gap-1.5 text-[12px] font-medium text-fg-muted">
                        <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        {razonBloqueo}
                      </p>
                    )}
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
