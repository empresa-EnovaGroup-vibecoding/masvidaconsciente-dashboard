"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { getPedidos, cambiarEstadoPedido, type Pedido } from "@/lib/api";

const ESTADOS = ["pendiente", "confirmado", "preparando", "entregado", "cancelado"];

const COLOR: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmado: "bg-blue-50 text-blue-700 ring-blue-600/20",
  preparando: "bg-violet-50 text-violet-700 ring-violet-600/20",
  entregado: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelado: "bg-red-50 text-red-700 ring-red-600/20",
};

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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Pedidos</h1>
        <p className="text-sm text-fg-muted mt-1">Todos los pedidos de tus clientes</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {pedidos === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-bg border border-borde animate-pulse" />
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="rounded-2xl border border-borde bg-bg p-12 text-center">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-bg-subtle flex items-center justify-center mb-4">
            <ShoppingBag className="h-5 w-5 text-fg-muted/60" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-fg">Aún no hay pedidos</p>
          <p className="text-sm text-fg-muted mt-1">
            Cuando un cliente ordene por WhatsApp, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <div
              key={p.id}
              className="bg-bg rounded-2xl border border-borde p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-fg">Pedido #{p.id}</p>
                  <p className="text-[13px] text-fg-muted mt-0.5 tnum">{p.cliente}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tracking-tight text-fg tnum">${p.total_usd.toFixed(2)}</p>
                  <span
                    className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset capitalize ${COLOR[p.estado] || ""}`}
                  >
                    {p.estado}
                  </span>
                </div>
              </div>
              <ul className="text-[13px] text-fg-muted space-y-1 mb-4">
                {p.items.map((it, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-fg">
                      <span className="tnum">{it.cantidad}×</span> {it.producto}
                    </span>
                    {it.precio_unitario != null && (
                      <span className="tnum">${it.precio_unitario}</span>
                    )}
                  </li>
                ))}
              </ul>
              {p.notas && <p className="text-[13px] text-fg-muted italic mb-4">Nota: {p.notas}</p>}
              <select
                value={p.estado}
                onChange={(e) => actualizar(p.id, e.target.value)}
                className="text-[13px] rounded-lg border border-borde bg-bg px-3 py-1.5 text-fg capitalize focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
