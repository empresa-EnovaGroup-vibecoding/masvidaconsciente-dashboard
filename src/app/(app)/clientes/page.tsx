"use client";

import { useEffect, useState } from "react";
import { Users, Search, Check } from "lucide-react";
import {
  getClientes,
  getCliente,
  guardarNotasCliente,
  type ClienteResumen,
  type ClienteDetalle,
} from "@/lib/api";
import { formatUSD, formatFecha } from "@/lib/format";
import { EstadoBadge } from "@/components/estado-badge";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { ErrorBanner } from "@/components/error-banner";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteResumen[] | null>(null);
  const [error, setError] = useState("");
  const [errorLista, setErrorLista] = useState("");
  const [errorDetalle, setErrorDetalle] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [activa, setActiva] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<ClienteDetalle | null>(null);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [notasOk, setNotasOk] = useState(false);

  function cargar() {
    setErrorLista("");
    getClientes()
      .then(setClientes)
      .catch((e) => setErrorLista((e as Error).message));
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrir(telefono: string) {
    setActiva(telefono);
    setDetalle(null);
    setErrorDetalle("");
    setNotasOk(false);
    getCliente(telefono)
      .then((d) => {
        setDetalle(d);
        setNotas(d.notas ?? "");
      })
      .catch((e) => setErrorDetalle((e as Error).message));
  }

  function recargarDetalle() {
    if (activa) abrir(activa);
  }

  async function guardarNotas() {
    if (!activa) return;
    setGuardando(true);
    setError("");
    try {
      await guardarNotasCliente(activa, notas);
      setNotasOk(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  const lista = (clientes ?? []).filter((c) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (c.nombre ?? "").toLowerCase().includes(q) || c.telefono.toLowerCase().includes(q);
  });

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[26px] font-extrabold num-tight text-fg">Clientes</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Tu gente: cuánto compran y notas para atenderlos mejor
        </p>
      </header>

      <ErrorBanner mensaje={error} />

      {errorLista && clientes === null ? (
        <ErrorState mensaje={errorLista} onRetry={cargar} />
      ) : clientes === null ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded-xl bg-bg shadow-card ring-hair" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-bg shadow-card ring-hair" />
            ))}
          </div>
          <div className="h-[420px] animate-pulse rounded-2xl bg-bg shadow-card ring-hair md:col-span-2" />
        </div>
      ) : clientes.length === 0 ? (
        <EmptyState
          icon={Users}
          titulo="Aún no hay clientes"
          texto="Aparecerán cuando alguien escriba por WhatsApp."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Lista + buscador */}
          <div className="space-y-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint"
                strokeWidth={1.8}
              />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar cliente por nombre o teléfono"
                placeholder="Buscar por nombre o teléfono"
                className="focus-ring w-full rounded-xl bg-bg py-2 pl-9 pr-3 text-sm text-fg ring-1 ring-borde placeholder:text-fg-faint"
              />
            </div>
            <div className="max-h-[520px] space-y-1.5 overflow-y-auto">
              {lista.map((c) => (
                <button
                  key={c.telefono}
                  onClick={() => abrir(c.telefono)}
                  className={`focus-ring w-full rounded-xl p-3 text-left transition ${
                    activa === c.telefono
                      ? "bg-bg shadow-card ring-1 ring-accent"
                      : "bg-bg ring-hair hover:bg-bg-subtle"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                      {(c.nombre || c.telefono).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-fg">{c.nombre || c.telefono}</p>
                        <span className="shrink-0 text-[13px] font-bold text-accent tnum num-snug">
                          {formatUSD(c.total_gastado_usd)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-fg-muted tnum">
                        {c.num_pedidos} {c.num_pedidos === 1 ? "pedido" : "pedidos"} · última{" "}
                        {formatFecha(c.ultima_compra)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {lista.length === 0 && (
                <p className="px-1 py-3 text-[13px] font-medium text-fg-muted">
                  Sin resultados para “{busqueda}”.
                </p>
              )}
            </div>
          </div>

          {/* Ficha */}
          <div className="min-h-[420px] rounded-2xl bg-bg p-6 shadow-card ring-hair md:col-span-2">
            {!activa ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm font-medium text-fg-muted">Elige un cliente para ver su ficha</p>
              </div>
            ) : errorDetalle && detalle === null ? (
              <ErrorState mensaje={errorDetalle} onRetry={recargarDetalle} />
            ) : detalle === null ? (
              <div className="space-y-3">
                <div className="h-8 w-40 animate-pulse rounded-md bg-bg-subtle" />
                <div className="h-20 animate-pulse rounded-xl bg-bg-subtle" />
              </div>
            ) : (
              <div>
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-base font-bold text-accent ring-1 ring-accent/15">
                      {(detalle.nombre || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold num-snug text-fg">{detalle.nombre || "Cliente"}</h2>
                      <p className="text-[13px] font-medium text-fg-muted tnum">{detalle.telefono}</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-fg-muted">
                    Cliente desde {formatFecha(detalle.primera_interaccion)}
                  </p>
                </div>

                {/* Stats */}
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-bg-subtle/60 p-4 ring-hair">
                    <p className="text-xs font-medium text-fg-muted">Total gastado</p>
                    <p className="mt-0.5 text-2xl font-extrabold num-snug text-accent tnum">
                      {formatUSD(detalle.total_gastado_usd)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-bg-subtle/60 p-4 ring-hair">
                    <p className="text-xs font-medium text-fg-muted">Pedidos</p>
                    <p className="mt-0.5 text-2xl font-extrabold num-snug text-fg tnum">{detalle.num_pedidos}</p>
                  </div>
                </div>

                {/* Notas internas */}
                <div className="mb-6">
                  <label htmlFor="notas-cliente" className="mb-1.5 block text-sm font-semibold text-fg">
                    Notas internas{" "}
                    <span className="font-medium text-fg-muted">(privadas — el cliente nunca las ve)</span>
                  </label>
                  <textarea
                    id="notas-cliente"
                    value={notas}
                    onChange={(e) => {
                      setNotas(e.target.value);
                      setNotasOk(false);
                    }}
                    rows={3}
                    placeholder="Ej. alérgica al maní, pide sin azúcar, entrega los sábados…"
                    className="focus-ring w-full resize-y rounded-xl bg-bg px-3 py-2 text-sm leading-relaxed text-fg ring-1 ring-borde placeholder:text-fg-faint"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={guardarNotas}
                      disabled={guardando}
                      className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
                    >
                      {guardando ? "Guardando…" : "Guardar nota"}
                    </button>
                    {notasOk && !guardando && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                        <Check className="h-4 w-4" strokeWidth={2} /> Guardado
                      </span>
                    )}
                  </div>
                </div>

                {/* Historial */}
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  Historial de pedidos
                </h3>
                {detalle.pedidos.length === 0 ? (
                  <p className="text-[13px] font-medium text-fg-muted">Todavía no ha hecho pedidos.</p>
                ) : (
                  <div className="space-y-2">
                    {detalle.pedidos.map((p) => (
                      <div key={p.id} className="rounded-xl bg-bg p-4 ring-hair">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[13px] font-semibold text-fg tnum">Pedido #{p.id}</p>
                          <span className="text-[13px] font-bold text-fg tnum num-snug">
                            {formatUSD(p.total_usd)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs font-medium text-fg-muted">{formatFecha(p.fecha)}</span>
                          <EstadoBadge estado={p.estado} />
                        </div>
                        {p.items && p.items.length > 0 && (
                          <p className="mt-1.5 truncate text-xs font-medium text-fg-muted">
                            {p.items.map((it) => `${it.cantidad}× ${it.producto}`).join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
