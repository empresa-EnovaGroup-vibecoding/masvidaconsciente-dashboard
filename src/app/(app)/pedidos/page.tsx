"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { getPedidos, cambiarEstadoPedido, type Pedido } from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { estiloEstado, ESTADOS_PEDIDO_MANUALES } from "@/lib/estados";
import { ErrorBanner } from "@/components/error-banner";

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState("");

  function cargar() {
    getPedidos().then(setPedidos).catch((e) => setError(e.message));
  }
  useEffect(cargar, []);

  async function actualizar(id: number, estado: string) {
    await cambiarEstadoPedido(id, estado);
    cargar();
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
                      {(p.cliente || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-fg">{p.cliente}</p>
                      <p className="text-xs font-medium text-fg-muted tnum">Pedido #{p.id}</p>
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

                <select
                  value={p.estado}
                  onChange={(e) => actualizar(p.id, e.target.value)}
                  className="focus-ring rounded-xl bg-bg px-3 py-2 text-[13px] text-fg ring-1 ring-borde transition hover:bg-bg-subtle focus:outline-none"
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
