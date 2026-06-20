"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Trash2, MessageCircle, User } from "lucide-react";
import {
  getPedidos,
  cambiarEstadoPedido,
  borrarPedido,
  type Pedido,
} from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { estiloEstado, ESTADOS_PEDIDO_MANUALES } from "@/lib/estados";
import { ErrorBanner } from "@/components/error-banner";

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState("");
  // id del pedido cuya petición está en vuelo (deshabilita SU select/botones).
  const [ocupado, setOcupado] = useState<number | null>(null);

  function cargar() {
    getPedidos().then(setPedidos).catch((e) => setError(e.message));
  }
  useEffect(() => {
    cargar();
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

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[26px] font-extrabold num-tight text-fg">Pedidos</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">Todos los pedidos de tus clientes</p>
      </header>

      <ErrorBanner mensaje={error} />

      {pedidos === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="rounded-2xl bg-bg p-12 text-center shadow-card ring-hair">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-semibold text-fg">Aún no hay pedidos</p>
          <p className="mt-1 text-sm font-medium text-fg-muted">
            Cuando un cliente ordene por WhatsApp, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const est = estiloEstado(p.estado);
            return (
              <div key={p.id} className="rounded-2xl bg-bg p-5 shadow-card ring-hair">
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
                    <span
                      className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${est.cls}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${est.dot}`} />
                      {est.label}
                    </span>
                  </div>
                </div>

                <ul className="mb-4 space-y-1 text-[13px] text-fg-muted">
                  {p.items.map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-fg">
                        <span className="tnum">{it.cantidad}×</span> {it.producto}
                      </span>
                      {it.precio_unitario != null && <span className="tnum">{formatUSD(it.precio_unitario)}</span>}
                    </li>
                  ))}
                </ul>

                {p.notas && <p className="mb-4 text-[13px] italic text-fg-muted">Nota: {p.notas}</p>}

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
                      onClick={() => cancelar(p.id)}
                      className="focus-ring rounded-xl bg-bg px-3 py-2 text-[13px] font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-bg-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={ocupado === p.id}
                    onClick={() => eliminar(p.id)}
                    aria-label={`Eliminar pedido #${p.id}`}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-red-600 ring-1 ring-red-600/20 transition hover:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
