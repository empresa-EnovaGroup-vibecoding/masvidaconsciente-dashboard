"use client";

import { useEffect, useState } from "react";
import { getPedidos, cambiarEstadoPedido, type Pedido } from "@/lib/api";

const ESTADOS = ["pendiente", "confirmado", "preparando", "entregado", "cancelado"];

const COLOR: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  confirmado: "bg-blue-100 text-blue-700",
  preparando: "bg-purple-100 text-purple-700",
  entregado: "bg-marca-100 text-marca-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
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
      <h1 className="text-2xl font-semibold text-marca-900 mb-1">Pedidos</h1>
      <p className="text-marca-600 mb-6">Todos los pedidos de tus clientes</p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {pedidos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-marca-100 p-10 text-center text-marca-600">
          Aún no hay pedidos. Cuando un cliente ordene por WhatsApp, aparecerá aquí.
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-marca-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-marca-900">Pedido #{p.id}</p>
                  <p className="text-sm text-marca-600">{p.cliente}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-marca-900">${p.total_usd.toFixed(2)}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${COLOR[p.estado] || ""}`}>
                    {p.estado}
                  </span>
                </div>
              </div>
              <ul className="text-sm text-marca-700 mb-3 space-y-0.5">
                {p.items.map((it, i) => (
                  <li key={i}>
                    {it.cantidad}× {it.producto}
                    {it.precio_unitario ? ` — $${it.precio_unitario}` : ""}
                  </li>
                ))}
              </ul>
              {p.notas && <p className="text-sm text-marca-600 italic mb-3">Nota: {p.notas}</p>}
              <select
                value={p.estado}
                onChange={(e) => actualizar(p.id, e.target.value)}
                className="text-sm rounded-lg border border-marca-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-marca-500"
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
