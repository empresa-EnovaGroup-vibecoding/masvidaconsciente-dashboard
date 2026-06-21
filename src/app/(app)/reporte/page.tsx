"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { DollarSign, CheckCircle2, ShoppingBag } from "lucide-react";
import { getReporte, type Reporte, type ReportePeriodo } from "@/lib/api";
import { formatUSD } from "@/lib/format";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";

const PERIODOS: { clave: keyof Reporte; titulo: string; sub: string }[] = [
  { clave: "hoy", titulo: "Hoy", sub: "Desde las 12:00 a.m." },
  { clave: "semana", titulo: "Esta semana", sub: "Últimos 7 días" },
  { clave: "mes", titulo: "Este mes", sub: "Últimos 30 días" },
];

export default function ReportePage() {
  const [rep, setRep] = useState<Reporte | null>(null);
  const [error, setError] = useState("");

  function cargar() {
    setError("");
    getReporte().then(setRep).catch((e) => setError(e.message));
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Reporte de ventas</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Solo cuenta pagos <span className="font-semibold text-fg">confirmados</span> por ti — dinero realmente cobrado.
        </p>
      </header>

      {error && rep === null ? (
        <ErrorState mensaje={error} onRetry={cargar} />
      ) : (
        <>
          <ErrorBanner mensaje={error} />

          <div className="space-y-6">
            {PERIODOS.map(({ clave, titulo, sub }) => (
              <Tarjeta key={clave} titulo={titulo} sub={sub} datos={rep ? rep[clave] : null} />
            ))}
          </div>
        </>
      )}
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
    <section className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold num-snug text-fg">{titulo}</h2>
        <span className="text-sm font-medium text-fg-muted">{sub}</span>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Dato label="Ventas" valor={datos ? formatUSD(datos.ventas_usd) : null} icon={DollarSign} destacado />
        <Dato label="Pagos confirmados" valor={datos ? String(datos.num_ventas) : null} icon={CheckCircle2} />
        <Dato label="Pedidos" valor={datos ? String(datos.pedidos) : null} icon={ShoppingBag} />
      </div>
    </section>
  );
}

function Dato({
  label,
  valor,
  icon: Icon,
  destacado,
}: {
  label: string;
  valor: string | null;
  icon: LucideIcon;
  destacado?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-bg-subtle/40 p-5 ring-hair">
      {destacado && <span className="absolute left-0 top-0 h-full w-1 bg-accent" />}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-fg-muted">{label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            destacado ? "bg-accent/10 text-accent" : "bg-bg-subtle text-fg-faint"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
      </div>
      {valor === null ? (
        <div className="mt-3 h-9 w-24 animate-pulse rounded-md bg-bg-subtle" />
      ) : (
        <p
          className={`mt-3 text-4xl font-extrabold num-tight tnum ${
            destacado ? "text-accent" : "text-fg"
          }`}
        >
          {valor}
        </p>
      )}
    </div>
  );
}
