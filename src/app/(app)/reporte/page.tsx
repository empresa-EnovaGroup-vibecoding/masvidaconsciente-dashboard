"use client";

import { useEffect, useState } from "react";
import { getReporte, type Reporte, type ReportePeriodo } from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { ErrorBanner } from "@/components/error-banner";

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
      <header className="mb-7">
        <h1 className="text-[26px] font-extrabold num-tight text-fg">Reporte de ventas</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Solo cuenta pagos <span className="font-semibold text-fg">confirmados</span> por ti — dinero realmente cobrado.
        </p>
      </header>

      <ErrorBanner mensaje={error} />

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
    <section className="rounded-2xl bg-bg p-5 shadow-card ring-hair">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold num-snug text-fg">{titulo}</h2>
        <span className="text-xs font-medium text-fg-muted">{sub}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Dato label="Ventas" valor={datos ? formatUSD(datos.ventas_usd) : null} destacado />
        <Dato label="Pagos confirmados" valor={datos ? String(datos.num_ventas) : null} />
        <Dato label="Pedidos" valor={datos ? String(datos.pedidos) : null} />
      </div>
    </section>
  );
}

function Dato({ label, valor, destacado }: { label: string; valor: string | null; destacado?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-fg-muted">{label}</p>
      {valor === null ? (
        <div className="h-7 w-20 animate-pulse rounded-md bg-bg-subtle" />
      ) : (
        <p
          className={`text-[24px] font-extrabold leading-none num-tight tnum ${
            destacado ? "text-accent" : "text-fg"
          }`}
        >
          {valor}
        </p>
      )}
    </div>
  );
}
