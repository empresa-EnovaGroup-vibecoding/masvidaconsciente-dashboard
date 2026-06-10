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
import { formatUSD } from "@/lib/format";

const fecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteResumen[] | null>(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [activa, setActiva] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<ClienteDetalle | null>(null);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [notasOk, setNotasOk] = useState(false);

  useEffect(() => {
    getClientes().then(setClientes).catch((e) => setError(e.message));
  }, []);

  function abrir(telefono: string) {
    setActiva(telefono);
    setDetalle(null);
    setNotasOk(false);
    getCliente(telefono)
      .then((d) => {
        setDetalle(d);
        setNotas(d.notas ?? "");
      })
      .catch((e) => setError(e.message));
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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Clientes</h1>
        <p className="text-sm text-fg-muted mt-1">Tu gente: cuánto compran y notas para atenderlos mejor</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {clientes === null ? (
        <div className="h-64 rounded-2xl bg-bg border border-borde animate-pulse" />
      ) : clientes.length === 0 ? (
        <div className="rounded-2xl border border-borde bg-bg p-12 text-center">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-bg-subtle flex items-center justify-center mb-4">
            <Users className="h-5 w-5 text-fg-muted/60" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-fg">Aún no hay clientes</p>
          <p className="text-sm text-fg-muted mt-1">Aparecerán cuando alguien escriba por WhatsApp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lista + buscador */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted/60" strokeWidth={1.8} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o teléfono"
                className="w-full rounded-xl border border-borde bg-bg pl-9 pr-3 py-2 text-sm text-fg placeholder:text-fg-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </div>
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
              {lista.map((c) => (
                <button
                  key={c.telefono}
                  onClick={() => abrir(c.telefono)}
                  className={`w-full text-left rounded-xl border p-3 transition-all duration-200 ${
                    activa === c.telefono
                      ? "border-accent bg-bg shadow-sm"
                      : "border-borde bg-bg hover:border-fg-muted/30"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-fg truncate">{c.nombre || c.telefono}</p>
                    <span className="text-[13px] font-semibold text-accent tnum shrink-0">
                      {formatUSD(c.total_gastado_usd)}
                    </span>
                  </div>
                  <p className="text-[12px] text-fg-muted mt-0.5 tnum">
                    {c.num_pedidos} {c.num_pedidos === 1 ? "pedido" : "pedidos"} · última {fecha(c.ultima_compra)}
                  </p>
                </button>
              ))}
              {lista.length === 0 && (
                <p className="text-[13px] text-fg-muted px-1 py-3">Sin resultados para “{busqueda}”.</p>
              )}
            </div>
          </div>

          {/* Ficha */}
          <div className="md:col-span-2 bg-bg rounded-2xl border border-borde p-5 min-h-[420px]">
            {!activa ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-fg-muted">Elige un cliente para ver su ficha</p>
              </div>
            ) : detalle === null ? (
              <div className="space-y-3">
                <div className="h-8 w-40 rounded bg-bg-subtle animate-pulse" />
                <div className="h-20 rounded-xl bg-bg-subtle animate-pulse" />
              </div>
            ) : (
              <div>
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-fg">{detalle.nombre || "Cliente"}</h2>
                    <p className="text-[13px] text-fg-muted tnum">{detalle.telefono}</p>
                  </div>
                  <p className="text-[12px] text-fg-muted">Cliente desde {fecha(detalle.primera_interaccion)}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl bg-bg-subtle/50 border border-borde p-3">
                    <p className="text-[12px] text-fg-muted">Total gastado</p>
                    <p className="text-xl font-semibold text-accent tnum">{formatUSD(detalle.total_gastado_usd)}</p>
                  </div>
                  <div className="rounded-xl bg-bg-subtle/50 border border-borde p-3">
                    <p className="text-[12px] text-fg-muted">Pedidos</p>
                    <p className="text-xl font-semibold text-fg tnum">{detalle.num_pedidos}</p>
                  </div>
                </div>

                {/* Notas internas */}
                <div className="mb-5">
                  <label className="block text-[12px] font-medium text-fg-muted mb-1">
                    Notas internas <span className="font-normal">(privadas — el cliente nunca las ve)</span>
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => {
                      setNotas(e.target.value);
                      setNotasOk(false);
                    }}
                    rows={3}
                    placeholder="Ej. alérgica al maní, pide sin azúcar, entrega los sábados…"
                    className="w-full rounded-xl border border-borde bg-bg px-3.5 py-2.5 text-[13px] leading-relaxed text-fg resize-y focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={guardarNotas}
                      disabled={guardando}
                      className="rounded-lg bg-accent text-white text-[13px] font-medium px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {guardando ? "Guardando…" : "Guardar nota"}
                    </button>
                    {notasOk && !guardando && (
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-green-700">
                        <Check className="h-4 w-4" strokeWidth={2} /> Guardado
                      </span>
                    )}
                  </div>
                </div>

                {/* Historial */}
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted/70 mb-2">
                  Historial de pedidos
                </p>
                {detalle.pedidos.length === 0 ? (
                  <p className="text-[13px] text-fg-muted">Todavía no ha hecho pedidos.</p>
                ) : (
                  <div className="space-y-2">
                    {detalle.pedidos.map((p) => (
                      <div key={p.id} className="rounded-xl border border-borde p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[13px] font-medium text-fg">Pedido #{p.id}</p>
                          <span className="text-[13px] font-semibold text-fg tnum">{formatUSD(p.total_usd)}</span>
                        </div>
                        <p className="text-[12px] text-fg-muted mt-0.5">
                          {fecha(p.fecha)} · {p.estado}
                        </p>
                        {p.items && p.items.length > 0 && (
                          <p className="text-[12px] text-fg-muted mt-1 truncate">
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
