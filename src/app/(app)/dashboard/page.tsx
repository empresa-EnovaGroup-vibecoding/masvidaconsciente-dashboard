"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ShoppingBag,
  DollarSign,
  Users,
  Clock,
  ArrowRight,
  Coins,
  RefreshCw,
  Lock,
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
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { EstadoBadge } from "@/components/estado-badge";
import { formatUSD, formatBs } from "@/lib/format";

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

function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-bg-subtle ${className}`} />;
}

interface Kpi {
  label: string;
  valor: string | null;
  sub: string;
  icon: LucideIcon;
  accent?: boolean;
  href?: string;
  cta?: string;
  /** true = su endpoint falló: se pinta un guion y un «Reintentar», nunca un esqueleto eterno. */
  fallido?: boolean;
}

export default function DashboardPage() {
  const [m, setM] = useState<Metricas | null>(null);
  const [tasa, setTasa] = useState<EstadoTasa | null>(null);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [botActivo, setBotActivo] = useState<boolean | null>(null);
  const [pagosPend, setPagosPend] = useState<number | null>(null);
  const [error, setError] = useState("");
  // 🔴 Qué tarjeta NO pudo cargar. Sin esto, el `.catch(() => {})` dejaba el estado en `null` —
  // que es EL MISMO valor que significa "cargando" — y el esqueleto giraba para siempre: la
  // dueña esperaba algo que ya había fallado, sin ningún botón para reintentar.
  const [fallo, setFallo] = useState({ tasa: false, reporte: false, pedidos: false, pagos: false });

  function cargar() {
    setError("");
    setFallo({ tasa: false, reporte: false, pedidos: false, pagos: false });
    getMetricas().then(setM).catch((e) => setError(e.message));
    getTasa().then(setTasa).catch(() => setFallo((f) => ({ ...f, tasa: true })));
    getReporte().then(setReporte).catch(() => setFallo((f) => ({ ...f, reporte: true })));
    getPedidos().then(setPedidos).catch(() => setFallo((f) => ({ ...f, pedidos: true })));
    // Este SÍ puede callar: con `null` la píldora dice «Estado desconocido», que es la verdad.
    getBotEstado().then((b) => setBotActivo(b.activo)).catch(() => setBotActivo(null));
    // 🔴 Antes: `.catch(() => setPagosPend(0))` — pintaba un 0 grande en «Pagos por verificar»
    // cuando el endpoint FALLÓ. Le afirmaba a la dueña "no tienes nada que revisar" sin saberlo,
    // y así se pierde un cobro. Es dinero: si no se sabe, no se inventa un cero tranquilizador
    // (la regla del cobro que ya declara el comentario del array `kpis`, más abajo).
    getPagos("reportado")
      .then((p) => setPagosPend(p.length))
      .catch(() => setFallo((f) => ({ ...f, pagos: true })));
  }

  useEffect(() => {
    cargar();
  }, []);

  const ultimos = pedidos
    ? [...pedidos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5)
    : null;

  // KPIs: SOLO números reales del API (nunca inventados — regla del cobro).
  const kpis: Kpi[] = [
    // 🔴 NO es el mes calendario: el backend lo calcula como `ahora - 30 días` (router.py:333),
    // una ventana móvil. El día 2 de agosto, "Cobrado este mes" incluía casi todo julio — y es
    // el número más grande del panel, el que la dueña usa para cuadrar caja. El nombre dice
    // ahora exactamente lo que el número es (la pantalla Reporte ya lo decía: "Últimos 30 días").
    { label: "Cobrado · últimos 30 días", valor: reporte ? formatUSD(reporte.mes.ventas_usd) : null, sub: "pagos confirmados · no es el mes calendario", icon: DollarSign, fallido: fallo.reporte },
    { label: "Pedidos hoy", valor: m ? String(m.pedidos_hoy) : null, sub: "hoy", icon: ShoppingBag },
    { label: "Pagos por verificar", valor: pagosPend === null ? null : String(pagosPend), sub: "por revisar", icon: Clock, accent: true, href: "/pagos", cta: "Revisar", fallido: fallo.pagos },
    { label: "Clientes", valor: m ? String(m.clientes_total) : null, sub: "en total", icon: Users },
  ];

  return (
    <div>
      {/* ── Encabezado ───────────────────────────────────────────── */}
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">{saludo()}</h1>
          <p className="mt-1 text-[15px] font-medium text-fg-muted">Resumen de hoy · {fechaHoy()}</p>
        </div>
        <Link
          href="/bot"
          className="focus-ring flex items-center gap-2 rounded-full bg-bg px-4 py-2 shadow-soft ring-hair transition hover:bg-bg-subtle"
        >
          {botActivo === null ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-fg-faint" />
              <span className="text-sm font-semibold text-fg-muted">Estado desconocido</span>
            </>
          ) : botActivo === false ? (
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
        </Link>
      </header>

      {error && m === null ? (
        <ErrorState mensaje={error} onRetry={cargar} />
      ) : (
        <>
          <ErrorBanner mensaje={error} />

          {/* ── Tarjetas KPI ───────────────────────────────────────── */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, valor, sub, icon: Icon, accent, href, cta, fallido }) => (
              <div
                key={label}
                className="card relative overflow-hidden rounded-2xl bg-bg p-6 shadow-card ring-hair"
              >
                {accent && <span className="absolute left-0 top-0 h-full w-1 bg-accent" />}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-fg-muted">{label}</p>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      accent ? "bg-accent/10 text-accent" : "bg-bg-subtle text-fg-faint"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                </div>
                {valor === null ? (
                  // Un guion dice "no lo sé"; el esqueleto dice "ya casi". Cuando el endpoint
                  // falló, seguir animando es mentir sobre una carga que nunca va a terminar.
                  fallido ? (
                    <p className="mt-3 text-4xl font-extrabold num-tight text-fg-faint tnum">—</p>
                  ) : (
                    <Skel className="mt-3 h-9 w-24" />
                  )
                ) : (
                  <p className="mt-3 text-4xl font-extrabold num-tight text-fg tnum">{valor}</p>
                )}
                {fallido ? (
                  <button onClick={cargar} className="lnk mt-1.5 text-xs font-bold text-accent hover:underline">
                    No se pudo cargar · Reintentar
                  </button>
                ) : href ? (
                  <Link href={href} className="lnk mt-1.5 text-xs font-bold text-accent hover:underline">
                    {cta} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </Link>
                ) : (
                  <p className="mt-1.5 text-xs font-medium text-fg-faint">{sub}</p>
                )}
              </div>
            ))}
          </section>

          {/* ── Tasa de cambio (BCV) ───────────────────────────────── */}
          <section className="mt-6">
            <div className="card flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-bg p-6 shadow-card ring-hair">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg-muted">Tasa de cambio (BCV)</p>
                {tasa === null ? (
                  fallo.tasa ? (
                    <p className="mt-1 text-4xl font-extrabold num-tight text-fg-faint tnum">—</p>
                  ) : (
                    <Skel className="mt-2 h-10 w-52" />
                  )
                ) : (
                  <p className="mt-1 text-4xl font-extrabold num-tight text-fg tnum">
                    {formatBs(tasa.tasa_efectiva)} <span className="text-2xl font-bold text-fg-faint">/ $</span>
                  </p>
                )}
                {/* Manual/Automática solo se dice cuando se SABE: `tasa?.manual_activa` con la
                    tasa en null daba undefined, caía al else y el panel afirmaba «Automática ·
                    se aplica al cobro» sin haber podido leer nada. Es el modo con el que se
                    cobra: no se declara de memoria. */}
                {tasa === null ? (
                  fallo.tasa && (
                    <button onClick={cargar} className="lnk mt-1.5 text-sm font-semibold text-accent hover:underline">
                      No se pudo cargar la tasa · Reintentar
                    </button>
                  )
                ) : (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-fg-muted">
                    {tasa.manual_activa ? (
                      <>
                        <Lock className="h-3.5 w-3.5" strokeWidth={2} /> Manual · candado activo
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} /> Automática · se aplica al cobro
                      </>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-5">
                <Link href="/tasa" className="lnk text-sm font-semibold text-accent hover:underline">
                  Ajustar <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </Link>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Coins className="h-6 w-6" strokeWidth={2} />
                </span>
              </div>
            </div>
          </section>

          {/* ── Últimos pedidos ────────────────────────────────────── */}
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
              fallo.pedidos ? (
                <div className="border-t border-borde/60">
                  <ErrorState
                    mensaje="No se pudieron cargar los últimos pedidos."
                    onRetry={cargar}
                    embedded
                  />
                </div>
              ) : (
                <div>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="border-t border-borde/60 px-6 py-4">
                      <Skel className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              )
            ) : ultimos.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                titulo="Aún no hay pedidos"
                texto="Cuando un cliente ordene por WhatsApp, aparecerá aquí."
                embedded
              />
            ) : (
              <ul className="divide-y divide-borde/60 border-t border-borde/60">
                {ultimos.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-bg-subtle/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                        {(p.nombre || p.cliente || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="truncate font-bold text-fg">{p.nombre || p.cliente}</p>
                        <p className="text-[13px] font-medium text-fg-muted">Pedido #{p.id}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-bold text-fg tnum">{formatUSD(p.total_usd)}</span>
                      <EstadoBadge estado={p.estado} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
