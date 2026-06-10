"use client";

import { useEffect, useState } from "react";
import { Wallet, Check, X, Scale } from "lucide-react";
import {
  getPagos,
  confirmarPago,
  rechazarPago,
  verificarMonto,
  getComprobanteUrl,
  type Pago,
  type EstadoPago,
} from "@/lib/api";
import { formatUSD, formatBs, formatTasa } from "@/lib/format";

const COLOR: Record<EstadoPago, string> = {
  reportado: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmado: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rechazado: "bg-red-50 text-red-700 ring-red-600/20",
  parcial: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

const ETIQUETA: Record<EstadoPago, string> = {
  reportado: "Por verificar",
  confirmado: "Confirmado",
  rechazado: "Rechazado",
  parcial: "Pago parcial",
};

/** Carga el comprobante como blob autenticado y lo muestra. Un <img src> directo
 * no sirve porque no manda el token, y el comprobante es privado. */
function Comprobante({ pago }: { pago: Pago }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pago.tiene_comprobante) return;
    let objectUrl: string | null = null;
    let activo = true;
    getComprobanteUrl(pago.id)
      .then((u) => {
        objectUrl = u;
        if (activo) setUrl(u);
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
      <div className="text-[13px] text-fg-muted italic">
        {pago.referencia ? `Referencia: ${pago.referencia}` : "Sin comprobante adjunto"}
      </div>
    );
  }
  if (error) {
    return <div className="text-[13px] text-red-600">No se pudo cargar el comprobante</div>;
  }
  if (!url) {
    return <div className="h-44 w-full max-w-xs rounded-xl bg-bg-subtle border border-borde animate-pulse" />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Comprobante del pago ${pago.id}`}
        className="max-h-56 rounded-xl border border-borde object-contain"
      />
    </a>
  );
}

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[] | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState<number | null>(null);
  const [montoAbierto, setMontoAbierto] = useState<number | null>(null);
  const [montoValor, setMontoValor] = useState("");

  function cargar() {
    getPagos().then(setPagos).catch((e) => setError(e.message));
  }
  useEffect(cargar, []);

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
    setEnviando(id);
    try {
      await verificarMonto(id, Number(montoValor));
      setMontoAbierto(null);
      setMontoValor("");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el monto");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Pagos</h1>
        <p className="text-sm text-fg-muted mt-1">
          Verifica los comprobantes y confirma los pagos de tus clientes
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {pagos === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-bg border border-borde animate-pulse" />
          ))}
        </div>
      ) : pagos.length === 0 ? (
        <div className="rounded-2xl border border-borde bg-bg p-12 text-center">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-bg-subtle flex items-center justify-center mb-4">
            <Wallet className="h-5 w-5 text-fg-muted/60" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-fg">Aún no hay pagos</p>
          <p className="text-sm text-fg-muted mt-1">
            Cuando un cliente reporte un pago por WhatsApp, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagos.map((p) => (
            <div key={p.id} className="bg-bg rounded-2xl border border-borde p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-fg">Pedido #{p.pedido_id}</p>
                  <p className="text-[13px] text-fg-muted mt-0.5 tnum">{p.cliente ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tracking-tight text-fg tnum">{formatBs(p.monto_bs)}</p>
                  <p className="text-[13px] text-fg-muted tnum">{formatUSD(p.monto_usd)}</p>
                  <span
                    className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${COLOR[p.estado]}`}
                  >
                    {ETIQUETA[p.estado]}
                  </span>
                </div>
              </div>

              {p.items && p.items.length > 0 && (
                <ul className="text-[13px] text-fg-muted space-y-1 mb-3">
                  {p.items.map((it, i) => (
                    <li key={i}>
                      <span className="tnum">{it.cantidad}×</span> {it.producto}
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-[12px] text-fg-muted mb-3 tnum">
                Tasa: {formatTasa(p.tasa_usada)}
                {p.referencia && <span className="ml-3">Ref: {p.referencia}</span>}
              </p>

              <div className="mb-4">
                <Comprobante pago={p} />
              </div>

              {p.estado === "reportado" ? (
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => confirmar(p.id)}
                      disabled={enviando === p.id}
                      className="flex items-center gap-1.5 text-[13px] font-medium rounded-lg bg-accent text-white px-3.5 py-2 hover:opacity-90 disabled:opacity-50 transition"
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
                      className="flex items-center gap-1.5 text-[13px] font-medium rounded-lg border border-borde text-fg px-3.5 py-2 hover:bg-bg-subtle disabled:opacity-50 transition"
                    >
                      <Scale className="h-4 w-4" strokeWidth={2} />
                      Monto distinto
                    </button>
                    <button
                      onClick={() => rechazar(p.id)}
                      disabled={enviando === p.id}
                      className="flex items-center gap-1.5 text-[13px] font-medium rounded-lg border border-borde text-fg-muted px-3.5 py-2 hover:bg-bg-subtle disabled:opacity-50 transition"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                      Rechazar
                    </button>
                  </div>

                  {montoAbierto === p.id && (
                    <div className="flex items-center gap-2 flex-wrap rounded-xl border border-borde bg-bg-subtle/50 p-3">
                      <span className="text-[13px] text-fg-muted">¿Cuánto recibiste? Bs</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        autoFocus
                        value={montoValor}
                        onChange={(e) => setMontoValor(e.target.value)}
                        placeholder={p.monto_bs ? String(p.monto_bs) : "0.00"}
                        className="w-32 rounded-lg border border-borde bg-bg px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      />
                      <button
                        onClick={() => registrarMonto(p.id)}
                        disabled={enviando === p.id || montoValor.trim() === ""}
                        className="text-[13px] font-medium rounded-lg bg-accent text-white px-3.5 py-1.5 hover:opacity-90 disabled:opacity-50 transition"
                      >
                        Registrar
                      </button>
                    </div>
                  )}
                </div>
              ) : p.estado === "parcial" ? (
                <p className="text-[12px] text-fg-muted">
                  Recibido {formatBs(p.monto_recibido)}
                  {p.monto_bs !== null && p.monto_recibido !== null && (
                    <span className="text-orange-700 font-medium">
                      {" "}· faltan {formatBs(p.monto_bs - p.monto_recibido)}
                    </span>
                  )}
                  {p.confirmado_por ? ` (${p.confirmado_por})` : ""}
                </p>
              ) : (
                <p className="text-[12px] text-fg-muted">
                  {p.estado === "confirmado" ? "Confirmado" : "Rechazado"}
                  {p.confirmado_por ? ` por ${p.confirmado_por}` : ""}
                  {p.estado === "confirmado" &&
                    p.monto_recibido !== null &&
                    p.monto_bs !== null &&
                    p.monto_recibido > p.monto_bs && (
                      <span> · saldo a favor {formatBs(p.monto_recibido - p.monto_bs)}</span>
                    )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
