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
    { label: "Pedidos hoy", valor: m ? String(m.pedidos_hoy) : null, icon: ShoppingBag },
    { label: "Ventas hoy", valor: m ? `$${m.ventas_hoy_usd.toFixed(2)}` : null, icon: DollarSign },
    { label: "Clientes", valor: m ? String(m.clientes_total) : null, icon: Users },
    { label: "Pendientes", valor: m ? String(m.pedidos_pendientes) : null, icon: Clock },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Resumen</h1>
        <p className="text-sm text-fg-muted mt-1">Cómo va tu negocio hoy</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tarjetas.map(({ label, valor, icon: Icon }) => (
          <div
            key={label}
            className="group bg-bg rounded-2xl border border-borde p-5 shadow-sm hover:shadow-md hover:border-borde transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-fg-muted">{label}</span>
              <Icon className="h-4 w-4 text-fg-muted/60 group-hover:text-accent transition-colors" strokeWidth={1.8} />
            </div>
            {valor === null ? (
              <div className="h-8 w-16 rounded-md bg-bg-subtle animate-pulse" />
            ) : (
              <p className="text-[28px] leading-none font-semibold tracking-tight text-fg tnum">{valor}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
