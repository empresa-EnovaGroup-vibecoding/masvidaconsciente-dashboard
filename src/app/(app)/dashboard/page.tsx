"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, DollarSign, Users, Clock } from "lucide-react";
import { getMetricas, type Metricas } from "@/lib/api";

export default function DashboardPage() {
  const [m, setM] = useState<Metricas | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMetricas().then(setM).catch((e) => setError(e.message));
  }, []);

  const tarjetas = [
    { label: "Pedidos hoy", valor: m?.pedidos_hoy ?? "—", icon: ShoppingBag },
    { label: "Ventas hoy", valor: m ? `$${m.ventas_hoy_usd.toFixed(2)}` : "—", icon: DollarSign },
    { label: "Clientes", valor: m?.clientes_total ?? "—", icon: Users },
    { label: "Pendientes", valor: m?.pedidos_pendientes ?? "—", icon: Clock },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-marca-900 mb-1">Resumen</h1>
      <p className="text-marca-600 mb-6">Cómo va tu negocio hoy</p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map(({ label, valor, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-marca-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-marca-600">{label}</span>
              <div className="h-9 w-9 rounded-lg bg-marca-50 flex items-center justify-center">
                <Icon className="h-4 w-4 text-marca-600" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-marca-900">{valor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
