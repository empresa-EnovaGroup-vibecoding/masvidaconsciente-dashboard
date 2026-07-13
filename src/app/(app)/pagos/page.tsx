"use client";

import { useEffect, useState } from "react";
import { Wallet, Check, X, Scale, RotateCcw, Ban } from "lucide-react";
import {
  getPagos,
  confirmarPago,
  rechazarPago,
  verificarMonto,
  reabrirPago,
  anularPago,
  getComprobanteUrl,
  type Pago,
  type EstadoPago,
} from "@/lib/api";
import { formatUSD, formatBs, formatTasa } from "@/lib/format";
import { estiloPago } from "@/lib/estados";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

/** Carga el comprobante como blob autenticado y lo muestra. Un <img src> directo
 * no sirve porque no manda el token, y el comprobante es privado. */
function Comprobante({ pago }: { pago: Pago }) {
  const [url, setUrl] = useState<string | null>(null);
  const [esPdf, setEsPdf] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pago.tiene_comprobante) return;
    let objectUrl: string | null = null;
    let activo = true;
    getComprobanteUrl(pago.id)
      .then(({ url: u, esPdf: pdf }) => {
        objectUrl = u;
        if (activo) { setUrl(u); setEsPdf(pdf); }
        else URL.revokeObjectURL(u);
      })
      .catch(() => setError(true));
    return () => {
      activo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pago.id, pago.tiene_comprobante]);

  if (!pago.tiene_comprobante) {
    return (
      <div className="text-[13px] italic text-fg-muted">
        {pago.referencia ? `Referencia: ${pago.referencia}` : "Sin comprobante adjunto"}
      </div>
    );
  }
  if (error) {
    return <div className="text-[13px] text-red-600">No se pudo cargar el comprobante</div>;
  }
  if (!url) {
    return <div className="h-44 w-full max-w-xs animate-pulse rounded-xl bg-bg-subtle ring-hair" />;
  }
  // Un comprobante puede venir en PDF: pintarlo con <img> daba una imagen ROTA.
  if (esPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2.5 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle"
      >
        Abrir el comprobante (PDF)
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Comprobante del pago ${pago.id}`}
        className="max-h-56 rounded-xl object-contain ring-hair"
      />
    </a>
  );
}

const FILTROS: { valor: EstadoPago; etiqueta: string }[] = [
  { valor: "reportado", etiqueta: "Por verificar" },
  { valor: "confirmado", etiqueta: "Confirmados" },
  { valor: "rechazado", etiqueta: "Rechazados" },
  { valor: "parcial", etiqueta: "Parciales" },
];

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[] | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState<number | null>(null);
  const [montoAbierto, setMontoAbierto] = useState<number | null>(null);
  const [montoValor, setMontoValor] = useState("");
  const [filtro, setFiltro] = useState<EstadoPago>("reportado");

  function cargar() {
    setError("");
    getPagos(filtro).then(setPagos).catch((e) => setError(e.message));
  }
  useEffect(cargar, [filtro]);

  async function confirmar(id: number) {
    setError("");
    setEnviando(id);
    try {
      await confirmarPago(id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar");
    } finally {
      setEnviando(null);
    }
  }

  async function rechazar(id: number) {
    if (!window.confirm("¿Rechazar este pago? Se le pedirá al cliente revisarlo.")) return;
    setError("");
    setEnviando(id);
    try {
      await rechazarPago(id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo rechazar");
    } finally {
      setEnviando(null);
    }
  }

  async function registrarMonto(id: number) {
    setError("");
    const n = Number(montoValor);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Monto invalido");
      return;
    }
    setEnviando(id);
    try {
      await verificarMonto(id, n);
      setMontoAbierto(null);
      setMontoValor("");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el monto");
    } finally {
      setEnviando(null);
    }
  }

  async function reabrir(id: number) {
    if (!window.confirm("¿Reabrir este pago? Volverá a Por verificar.")) return;
    setError("");
    setEnviando(id);
    try {
      await reabrirPago(id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reabrir");
    } finally {
      setEnviando(null);
    }
  }

  async function anular(id: number) {
    if (
      !window.confirm(
        "¿Anular este pago confirmado? Volverá a Por verificar y se descontará del reporte.",
      )
    )
      return;
    setError("");
    setEnviando(id);
    try {
      await anularPago(id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo anular");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Pagos</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Verifica los comprobantes y confirma los pagos de tus clientes
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`focus-ring rounded-xl px-3.5 py-2 text-[13px] font-semibold ring-1 ring-inset transition ${
              filtro === f.valor
                ? "bg-accent text-accent-fg ring-accent"
                : "bg-bg text-fg-muted ring-borde hover:bg-bg-subtle"
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {pagos !== null && <ErrorBanner mensaje={error} />}

      {error && pagos === null ? (
        <ErrorState mensaje={error} onRetry={cargar} />
      ) : pagos === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : pagos.length === 0 ? (
        <EmptyState
          icon={Wallet}
          titulo="Aún no hay pagos"
          texto="Cuando un cliente reporte un pago por WhatsApp, aparecerá aquí."
        />
      ) : (
        <div className="space-y-3">
          {pagos.map((p) => (
            <div key={p.id} className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                    {(p.cliente ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-fg">{p.cliente ?? "—"}</p>
                    <p className="text-xs font-medium text-fg-muted tnum">Pedido #{p.pedido_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold num-snug text-fg tnum">{formatBs(p.monto_bs)}</p>
                  <p className="text-[13px] font-medium text-fg-muted tnum">{formatUSD(p.monto_usd)}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${estiloPago(p.estado).cls}`}
                  >
                    {estiloPago(p.estado).label}
                  </span>
                </div>
              </div>

              {p.items && p.items.length > 0 && (
                <ul className="mb-3 space-y-1 text-[13px] text-fg-muted">
                  {p.items.map((it, i) => (
                    <li key={i}>
                      <span className="tnum">{it.cantidad}×</span> {it.producto}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mb-3 text-[12px] font-medium text-fg-muted tnum">
                Tasa: {formatTasa(p.tasa_usada)}
                {p.referencia && <span className="ml-3">Ref: {p.referencia}</span>}
              </p>

              <div className="mb-4">
                <Comprobante pago={p} />
              </div>

              {p.estado === "reportado" ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => confirmar(p.id)}
                      disabled={enviando === p.id}
                      className="focus-ring flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" strokeWidth={2} />
                      {enviando === p.id ? "Confirmando…" : "Confirmar pago"}
                    </button>
                    <button
                      onClick={() => {
                        setMontoAbierto(montoAbierto === p.id ? null : p.id);
                        setMontoValor("");
                      }}
                      disabled={enviando === p.id}
                      className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                    >
                      <Scale className="h-4 w-4" strokeWidth={2} />
                      Monto distinto
                    </button>
                    <button
                      onClick={() => rechazar(p.id)}
                      disabled={enviando === p.id}
                      className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                      Rechazar
                    </button>
                  </div>

                  {montoAbierto === p.id && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-bg-subtle p-3 ring-hair">
                      <span className="text-[13px] font-medium text-fg-muted">¿Cuánto recibiste? Bs</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={montoValor}
                        onChange={(e) => setMontoValor(e.target.value)}
                        placeholder={p.monto_bs ? String(p.monto_bs) : "0.00"}
                        className="focus-ring w-32 rounded-lg bg-bg px-3 py-1.5 text-sm text-fg ring-1 ring-borde"
                      />
                      <button
                        onClick={() => registrarMonto(p.id)}
                        disabled={enviando === p.id || montoValor.trim() === ""}
                        className="focus-ring rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
                      >
                        Registrar
                      </button>
                    </div>
                  )}
                </div>
              ) : p.estado === "parcial" ? (
                <div className="space-y-3">
                  <p className="text-[12px] font-medium text-fg-muted">
                    Recibido {formatBs(p.monto_recibido)}
                    {p.monto_bs !== null && p.monto_recibido !== null && (
                      <span className="font-semibold text-orange-700">
                        {" "}· faltan {formatBs(p.monto_bs - p.monto_recibido)}
                      </span>
                    )}
                    {p.confirmado_por ? ` (${p.confirmado_por})` : ""}
                  </p>
                  <button
                    onClick={() => reabrir(p.id)}
                    disabled={enviando === p.id}
                    className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    Reabrir
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[12px] font-medium text-fg-muted">
                    {p.estado === "confirmado" ? "Confirmado" : "Rechazado"}
                    {p.confirmado_por ? ` por ${p.confirmado_por}` : ""}
                    {p.estado === "confirmado" &&
                      p.monto_recibido !== null &&
                      p.monto_bs !== null &&
                      p.monto_recibido > p.monto_bs && (
                        <span> · saldo a favor {formatBs(p.monto_recibido - p.monto_bs)}</span>
                      )}
                  </p>
                  {p.estado === "rechazado" && (
                    <button
                      onClick={() => reabrir(p.id)}
                      disabled={enviando === p.id}
                      className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" strokeWidth={2} />
                      Reabrir
                    </button>
                  )}
                  {p.estado === "confirmado" && (
                    <button
                      onClick={() => anular(p.id)}
                      disabled={enviando === p.id}
                      className="focus-ring flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      <Ban className="h-4 w-4" strokeWidth={2} />
                      {enviando === p.id ? "Anulando…" : "Anular pago"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
