"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  DollarSign,
  Users,
  Clock,
  ArrowRight,
  CheckCheck,
  Coins,
  RefreshCw,
  Lock,
  SlidersHorizontal,
} from "lucide-react";
import {
  getMetricas,
  getTasa,
  getReporte,
  getPedidos,
  getBotEstado,
  getPagos,
  type Metricas,
  type EstadoTasa,
  type Reporte,
  type Pedido,
} from "@/lib/api";

// ─── Helpers de formato (Venezuela: punto de miles, coma decimal) ───────
const fmt = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = (n: number) => `$${fmt(n)}`;
const bs = (n: number) => `Bs ${fmt(n)}`;

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fechaHoy(): string {
  const f = new Date().toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return f.charAt(0).toUpperCase() + f.slice(1);
}

function hora(fecha: string): string {
  return new Date(fecha).toLocaleTimeString("es-VE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Estilos de estado de pedido (paleta calmada) ───────────────────────
const ESTADO: Record<string, { cls: string; dot: string }> = {
  pendiente: { cls: "bg-warn-bg text-warn ring-warn-border", dot: "bg-warn" },
  confirmado: { cls: "bg-accent/10 text-accent ring-accent/15", dot: "bg-accent" },
  preparando: { cls: "bg-bg-subtle text-fg-muted ring-borde", dot: "bg-fg-faint" },
  entregado: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500" },
  cancelado: { cls: "bg-red-50 text-red-700 ring-red-600/15", dot: "bg-red-500" },
};

function EstadoBadge({ estado }: { estado: string }) {
  const e = ESTADO[estado] ?? ESTADO.preparando;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${e.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${e.dot}`} />
      {estado}
    </span>
  );
}

function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-bg-subtle ${className}`} />;
}

export default function DashboardPage() {
  const [m, setM] = useState<Metricas | null>(null);
  const [tasa, setTasa] = useState<EstadoTasa | null>(null);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [botActivo, setBotActivo] = useState<boolean | null>(null);
  const [pagosPend, setPagosPend] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    getMetricas().then(setM).catch((e) => setError(e.message));
    getTasa().then(setTasa).catch(() => {});
    getReporte().then(setReporte).catch(() => {});
    getPedidos().then(setPedidos).catch(() => {});
    getBotEstado().then((b) => setBotActivo(b.activo)).catch(() => {});
    getPagos("reportado").then((p) => setPagosPend(p.length)).catch(() => {});
  }, []);

  const ventasBs = m && tasa?.tasa_efectiva ? m.ventas_hoy_usd * tasa.tasa_efectiva : null;
  const ultimos = pedidos
    ? [...pedidos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5)
    : null;

  // "Facturado hoy" = valor de los pedidos del día (pagados o no). El dinero
  // COBRADO (pagos confirmados) se muestra aparte, en la sección "Cobrado".
  const tarjetas = [
    { label: "Pedidos hoy", valor: m ? String(m.pedidos_hoy) : null, sub: "hoy", icon: ShoppingBag },
    { label: "Facturado hoy", valor: m ? usd(m.ventas_hoy_usd) : null, sub: ventasBs ? `≈ ${bs(ventasBs)}` : "hoy", icon: DollarSign },
    { label: "Clientes", valor: m ? String(m.clientes_total) : null, sub: "en total", icon: Users },
  ];

  const periodos = reporte
    ? [
        { label: "Hoy", d: reporte.hoy },
        { label: "Esta semana", d: reporte.semana },
        { label: "Este mes", d: reporte.mes },
      ]
    : null;
  const maxVentas = reporte ? Math.max(reporte.mes.ventas_usd, 1) : 1;

  return (
    <div>
      {/* ── Encabezado ───────────────────────────────────────────── */}
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold leading-tight num-tight text-fg">{saludo()}</h1>
          <p className="mt-1 text-base font-semibold text-fg-muted">{fechaHoy()}</p>
          <p className="mt-1 text-[15px] font-medium text-fg-muted">
            Así va tu negocio hoy. Sigamos cuidando a tus clientes.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-bg px-4 py-2 shadow-soft ring-hair">
          {botActivo === false ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-fg-faint" />
              <span className="text-sm font-semibold text-fg-muted">Bot pausado</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              <span className="text-sm font-semibold text-fg">Bot activo</span>
            </>
          )}
        </div>
      </header>

      {/* ── Acciones rápidas ─────────────────────────────────────── */}
      <div className="mb-7 flex flex-wrap gap-3">
        <Link
          href="/pagos"
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent-soft"
        >
          <CheckCheck className="h-[18px] w-[18px]" strokeWidth={2} />
          Confirmar pagos{pagosPend > 0 ? ` (${pagosPend})` : ""}
        </Link>
        <Link
          href="/pedidos"
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-bg px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle"
        >
          <ShoppingBag className="h-[18px] w-[18px] text-accent" strokeWidth={2} />
          Ver pedidos
        </Link>
        <Link
          href="/tasa"
          className="focus-ring inline-flex items-center gap-2 rounded-full bg-bg px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle"
        >
          <Coins className="h-[18px] w-[18px] text-accent" strokeWidth={2} />
          Ajustar tasa
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-600/15">
          {error}
        </div>
      )}

      {/* ── Tarjetas de métrica ──────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ label, valor, sub, icon: Icon }) => (
          <div key={label} className="card rounded-2xl bg-bg p-5 shadow-card ring-hair">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-fg-muted">{label}</p>
            {valor === null ? (
              <Skel className="mt-1.5 h-8 w-20" />
            ) : (
              <p className="mt-1 text-3xl font-extrabold num-tight text-fg tnum">{valor}</p>
            )}
            <p className="mt-1 text-xs font-medium text-fg-faint tnum">{sub}</p>
          </div>
        ))}

        {/* Pendientes (resaltada en ámbar; el ámbar es acento, el número va en fg) */}
        <div className="rounded-2xl bg-warn-bg p-5 shadow-card ring-1 ring-warn-border">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-warn/15 text-warn">
            <Clock className="h-5 w-5" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-warn">Pendientes</p>
          {m === null ? (
            <Skel className="mt-1.5 h-8 w-12" />
          ) : (
            <p className="mt-1 text-3xl font-extrabold num-tight text-fg tnum">{m.pedidos_pendientes}</p>
          )}
          <Link href="/pedidos" className="lnk mt-1 text-xs font-bold text-warn hover:underline">
            Ver pendientes <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      {/* ── Cobrado (pagos confirmados) + Tasa BCV ───────────────── */}
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Cobrado */}
        <div className="rounded-2xl bg-bg p-6 shadow-card ring-hair lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold num-snug text-fg">Cobrado</h2>
              <p className="mt-0.5 text-sm font-medium text-fg-muted">Pagos confirmados · Hoy · Semana · Mes</p>
            </div>
            <Link href="/reporte" className="lnk text-sm font-semibold text-accent hover:underline">
              Ver reporte <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>

          <div className="mt-5 space-y-5">
            {periodos === null
              ? [0, 1, 2].map((i) => <Skel key={i} className="h-12 w-full" />)
              : periodos.map(({ label, d }) => (
                  <div key={label}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-fg">{label}</span>
                      <span className="text-lg font-extrabold num-snug text-fg tnum">{usd(d.ventas_usd)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-subtle">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(3, (d.ventas_usd / maxVentas) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-medium text-fg-faint tnum">
                      {d.num_ventas} {d.num_ventas === 1 ? "pago" : "pagos"}
                    </p>
                  </div>
                ))}
          </div>
        </div>

        {/* Tasa BCV */}
        <div className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold num-snug text-fg">Tasa BCV</h2>
            {tasa?.manual_activa ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2.5 py-1 text-xs font-semibold text-warn ring-1 ring-warn-border">
                <Lock className="h-3.5 w-3.5" strokeWidth={2} /> Manual
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} /> Automática
              </span>
            )}
          </div>

          <p className="mt-6 text-sm font-semibold text-fg-muted">Tasa efectiva</p>
          {tasa === null ? (
            <Skel className="mt-1.5 h-9 w-40" />
          ) : (
            <p className="mt-1 text-4xl font-extrabold num-tight text-fg tnum">
              {tasa.tasa_efectiva != null ? bs(tasa.tasa_efectiva) : "—"}
            </p>
          )}
          <p className="mt-1 text-sm font-medium text-fg-muted">por cada $1</p>

          <div className="mt-6 space-y-3 rounded-xl bg-bg-subtle p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-fg-muted">Margen aplicado</span>
              <span className="font-bold text-fg tnum">{tasa ? `${tasa.margen_pct}%` : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-fg-muted">Fuente</span>
              <span className="font-bold text-fg">BCV oficial</span>
            </div>
          </div>

          <Link
            href="/tasa"
            className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-bg py-2.5 text-sm font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle"
          >
            <SlidersHorizontal className="h-[18px] w-[18px] text-accent" strokeWidth={2} />
            Ajustar margen
          </Link>
        </div>
      </section>

      {/* ── Últimos pedidos ──────────────────────────────────────── */}
      <section className="mt-6 overflow-hidden rounded-2xl bg-bg shadow-card ring-hair">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold num-snug text-fg">Últimos pedidos</h2>
            <p className="mt-0.5 text-sm font-medium text-fg-muted">Movimiento más reciente</p>
          </div>
          <Link href="/pedidos" className="lnk text-sm font-semibold text-accent hover:underline">
            Ver todos <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </Link>
        </div>

        {ultimos === null ? (
          <div className="space-y-px">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4">
                <Skel className="h-6 w-full" />
              </div>
            ))}
          </div>
        ) : ultimos.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-fg">Aún no hay pedidos</p>
            <p className="mt-1 text-sm font-medium text-fg-muted">
              Cuando un cliente ordene por WhatsApp, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Últimos pedidos</caption>
              <thead>
                <tr className="border-y border-borde/70 bg-bg-subtle text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Pedido</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde/60">
                {ultimos.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-bg-subtle/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                          {(p.cliente || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-fg">{p.cliente}</span>
                      </div>
                    </td>
                    <td className="max-w-[260px] truncate px-6 py-4 font-medium text-fg-muted">
                      {p.items.map((it) => it.producto).join(" + ") || "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-fg tnum">{usd(p.total_usd)}</td>
                    <td className="px-6 py-4">
                      <EstadoBadge estado={p.estado} />
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-fg-muted tnum">{hora(p.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
