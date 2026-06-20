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
import { ErrorBanner } from "@/components/error-banner";

const COLOR: Record<EstadoPago, string> = {
  reportado: "bg-warn-bg text-warn ring-warn-border",
  confirmado: "bg-accent/10 text-accent ring-accent/15",
  rechazado: "bg-red-50 text-red-700 ring-red-600/15",
  parcial: "bg-orange-50 text-orange-700 ring-orange-600/15",
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
      <header className="mb-7">
        <h1 className="text-[26px] font-extrabold num-tight text-fg">Pagos</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Verifica los comprobantes y confirma los pagos de tus clientes
        </p>
      </header>

      <ErrorBanner mensaje={error} />

      {pagos === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : pagos.length === 0 ? (
        <div className="rounded-2xl bg-bg p-12 text-center shadow-card ring-hair">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Wallet className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-semibold text-fg">Aún no hay pagos</p>
          <p className="mt-1 text-sm font-medium text-fg-muted">
            Cuando un cliente reporte un pago por WhatsApp, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagos.map((p) => (
            <div key={p.id} className="rounded-2xl bg-bg p-5 shadow-card ring-hair">
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
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${COLOR[p.estado]}`}
                  >
                    {ETIQUETA[p.estado]}
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
                <p className="text-[12px] font-medium text-fg-muted">
                  Recibido {formatBs(p.monto_recibido)}
                  {p.monto_bs !== null && p.monto_recibido !== null && (
                    <span className="font-semibold text-orange-700">
                      {" "}· faltan {formatBs(p.monto_bs - p.monto_recibido)}
                    </span>
                  )}
                  {p.confirmado_por ? ` (${p.confirmado_por})` : ""}
                </p>
              ) : (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
