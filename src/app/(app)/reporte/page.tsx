"use client";

import { useEffect, useState } from "react";
import { getReporte, type Reporte, type ReportePeriodo } from "@/lib/api";

const PERIODOS: { clave: keyof Reporte; titulo: string; sub: string }[] = [
  { clave: "hoy", titulo: "Hoy", sub: "Desde las 12:00 a.m." },
  { clave: "semana", titulo: "Esta semana", sub: "Últimos 7 días" },
  { clave: "mes", titulo: "Este mes", sub: "Últimos 30 días" },
];

export default function ReportePage() {
  const [rep, setRep] = useState<Reporte | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getReporte().then(setRep).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Reporte de ventas</h1>
        <p className="text-sm text-fg-muted mt-1">
          Solo cuenta pagos <span className="font-medium text-fg">confirmados</span> por ti — dinero realmente cobrado.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {PERIODOS.map(({ clave, titulo, sub }) => (
          <Tarjeta key={clave} titulo={titulo} sub={sub} datos={rep ? rep[clave] : null} />
        ))}
      </div>
    </div>
  );
}

function Tarjeta({
  titulo,
  sub,
  datos,
}: {
  titulo: string;
  sub: string;
  datos: ReportePeriodo | null;
}) {
  return (
    <section className="bg-bg rounded-2xl border border-borde p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-fg">{titulo}</h2>
        <span className="text-[12px] text-fg-muted">{sub}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Dato label="Ventas" valor={datos ? `$${datos.ventas_usd.toFixed(2)}` : null} destacado />
        <Dato label="Pagos confirmados" valor={datos ? String(datos.num_ventas) : null} />
        <Dato label="Pedidos" valor={datos ? String(datos.pedidos) : null} />
      </div>
    </section>
  );
}

function Dato({ label, valor, destacado }: { label: string; valor: string | null; destacado?: boolean }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-fg-muted mb-1.5">{label}</p>
      {valor === null ? (
        <div className="h-7 w-20 rounded-md bg-bg-subtle animate-pulse" />
      ) : (
        <p
          className={`text-[24px] leading-none font-semibold tracking-tight tnum ${
            destacado ? "text-accent" : "text-fg"
          }`}
        >
          {valor}
        </p>
      )}
    </div>
  );
}
