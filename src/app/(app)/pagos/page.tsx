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

/** 💵 LA MONEDA LA PONE EL PAGO, NO LA PANTALLA. Si hay `monto_bs` se cobró en bolívares; si no
 * (Zelle/Binance/efectivo) se cobró en dólares y `monto_bs` viene null (tools.py:2174). Es EL
 * MISMO criterio que el backend (`en_bs = pago.monto_bs is not None`, router.py:2765): si aquí se
 * decidiera distinto, el número que teclea la dueña y el que compara el servidor serían de dos
 * monedas — y el pedido quedaría PAGADO con la deuda intacta. */
function moneda(p: Pago): {
  simbolo: string;
  cobrado: number | null;
  fmt: (v: number | null | undefined) => string;
} {
  const enBs = p.monto_bs !== null;
  return {
    simbolo: enBs ? "Bs" : "$",
    cobrado: enBs ? p.monto_bs : p.monto_usd,
    fmt: enBs ? formatBs : formatUSD,
  };
}

/** ¿La cifra que la visión leyó en el comprobante y lo que se cobró están en la MISMA moneda?
 *
 * 🔴 `monto_recibido` se guarda TAL CUAL lo leyó la visión (tools.py:2193), SIN unidad. La rama de
 * divisas (tools.py:2171) solo se activa si el número calza con el precio en dólares y NO con el
 * monto en bolívares: un pago en dólares por el monto COMPLETO no entra por ahí y queda como
 * pago_movil, con `monto_bs` lleno y `monto_recibido` = 18,40. Comparar 18,40 contra 16.591 gritaba
 * «faltan Bs 16.572,60» sobre un pago CORRECTO, y el panel empujaba a «Monto distinto» — que deja
 * el pago en 'parcial' y le manda al cliente un WhatsApp reclamándole plata que no debe
 * (router.py:2797-2806). Por eso el falso positivo se ataca aquí, una sola vez, y no en cada sitio
 * que compara. (Auditoría 2026-08-02, corrección C2.) */
function mismaMoneda(p: Pago): boolean {
  if (p.monto_recibido === null) return false;
  // Sin los dos importes no hay ambigüedad posible: solo existe una moneda para este pago.
  if (p.monto_bs === null || p.monto_usd === null) return true;
  // Si lo leído se parece MÁS al monto en dólares que al de bolívares, el comprobante venía en $.
  return Math.abs(p.monto_recibido - p.monto_bs) <= Math.abs(p.monto_recibido - p.monto_usd);
}

/** Lo COBRADO vs. lo que la VISIÓN leyó en el comprobante, en la moneda del pago.
 * null si falta cualquiera de los dos datos — o si no están en la misma moneda (`mismaMoneda`):
 * restar bolívares menos dólares no da una diferencia, da un susto. */
function faltante(p: Pago): { cobrado: number; recibido: number; dif: number } | null {
  const { cobrado } = moneda(p);
  if (cobrado === null || p.monto_recibido === null) return null;
  if (!mismaMoneda(p)) return null;
  return { cobrado, recibido: p.monto_recibido, dif: p.monto_recibido - cobrado };
}

/** Por qué este pago NO se puede cobrar, en las mismas palabras que usaría el 409 del backend.
 * null = adelante. Se calcula en el panel para no OFRECER lo que el servidor va a rechazar:
 * `confirmar` y `verificar-monto` devuelven 409 con un pedido CANCELADO (`_pedido_admite_cobro`) o
 * con otro pago ya confirmado del mismo pedido (`_no_hay_otro_pago_confirmado`).
 *
 * Esconder botones es COSMÉTICO, no una puerta: el candado de verdad vive en el 409, y entre el
 * GET y el clic otro operador puede confirmar el otro pago. Por eso el error POR TARJETA
 * (`errorPago`) no es un adorno de este candado: es la red debajo. */
function motivoBloqueo(p: Pago): string | null {
  if (p.pedido_estado === "cancelado") {
    return `El pedido #${p.pedido_id} está CANCELADO: no se le puede cobrar. Si la venta se retomó, cambia primero el estado del pedido.`;
  }
  // `!= null` a propósito, para atrapar null Y undefined: los dos campos son OPCIONALES en el tipo
  // porque un panel servido contra un backend viejo no los recibe. Con `!== null` ese `undefined`
  // bloquearía TODAS las tarjetas y dejaría la bandeja del dinero sin un solo botón.
  if (p.otro_pago_confirmado != null) {
    return `El pedido #${p.pedido_id} ya tiene el pago #${p.otro_pago_confirmado} confirmado. Si aquel estuvo mal, anúlalo primero y vuelve a intentarlo.`;
  }
  return null;
}

/** 🔴 EL COMPROBANTE, ANTES DE PULSAR CONFIRMAR (auditoría 2026-08-02, DIN-3).
 * `monto_usd`/`monto_bs` es lo que se COBRÓ; `monto_recibido` es lo que el cliente MANDÓ. Hasta
 * aquí la tarjeta solo enseñaba lo cobrado, en grande, con «Confirmar pago» a 40px: un clic y el
 * pedido quedaba pagado con Bs 11.591 sin cobrar (commit b33bf3b).
 *
 * Nunca bloquea ni deshabilita nada: la dueña tiene el comprobante a la vista dos líneas más
 * arriba y ella es la autoridad. Este texto DESCRIBE lo que dice la captura, no acusa a nadie. */
function AvisoMonto({ pago }: { pago: Pago }) {
  const { fmt } = moneda(pago);
  if (pago.monto_recibido === null) {
    return (
      <p className="text-[12px] font-medium text-fg-muted">
        No se pudo leer el monto del comprobante: compáralo tú con la captura antes de confirmar.
      </p>
    );
  }
  // Va ANTES de cualquier resta: si las monedas no calzan, la resta miente (ver `mismaMoneda`).
  if (!mismaMoneda(pago)) {
    return (
      <p className="text-[12px] font-medium text-amber-700 tnum">
        El comprobante dice{" "}
        {pago.monto_recibido.toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        , y este pago se cobró en bolívares: la cifra parece estar en dólares. Compárala tú con la
        captura antes de confirmar.
      </p>
    );
  }
  const d = faltante(pago);
  if (!d || Math.abs(d.dif) < 0.01) {
    return (
      <p className="text-[12px] font-medium text-fg-muted tnum">
        El comprobante dice {fmt(pago.monto_recibido)} · calza con lo cobrado
      </p>
    );
  }
  const falta = d.dif < 0;
  return (
    <div
      role="alert"
      className={`rounded-xl px-3.5 py-2.5 text-[13px] font-semibold tnum ring-1 ring-inset ${
        falta
          ? "bg-red-50 text-red-700 ring-red-600/15"
          : "bg-orange-50 text-orange-700 ring-orange-600/15"
      }`}
    >
      El comprobante dice {fmt(pago.monto_recibido)} y se cobraron {fmt(d.cobrado)}:{" "}
      {falta ? `faltan ${fmt(-d.dif)}` : `pagó ${fmt(d.dif)} de más`}.{" "}
      <span className="font-medium">
        {falta
          ? "Si confirmas, el pedido queda pagado con esa diferencia sin cobrar. Usa «Monto distinto» para dejarlo en parcial."
          : "Con «Monto distinto» le queda registrado el saldo a favor."}
      </span>
    </div>
  );
}

/** «· faltan Bs 5.000» / «· saldo a favor $2,00», SIEMPRE en la moneda del pago.
 * Antes esto vivía duplicado en dos ramas y con `formatBs` fijo, y además condicionado a
 * `monto_bs !== null`: desde que verificar-monto acepta divisas (DIN-11) un Zelle SÍ puede caer a
 * parcial, y se rotulaba «Bs» y jamás decía cuánto faltaba. */
function Saldo({ pago }: { pago: Pago }) {
  const d = faltante(pago);
  if (!d || Math.abs(d.dif) < 0.01) return null;
  const { fmt } = moneda(pago);
  return d.dif < 0 ? (
    <span className="font-semibold text-orange-700"> · faltan {fmt(-d.dif)}</span>
  ) : (
    <span className="font-semibold text-emerald-700"> · saldo a favor {fmt(d.dif)}</span>
  );
}

/** La fila para teclear lo que se recibió de verdad. UN SOLO componente para las dos ramas que la
 * usan ('reportado' y 'parcial'): estaba a punto de quedar duplicada, y tres arreglos distintos
 * (la etiqueta de moneda, la precarga, el botón del parcial) caían justo encima — con dos copias,
 * el siguiente se aplica a una sola y las pantallas empiezan a decir cosas distintas. */
function FilaMonto({
  pago,
  valor,
  enviando,
  onCambio,
  onRegistrar,
}: {
  pago: Pago;
  valor: string;
  enviando: boolean;
  onCambio: (v: string) => void;
  onRegistrar: () => void;
}) {
  const m = moneda(pago);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-bg-subtle p-3 ring-hair">
      {/* 💵 La moneda la pone el PAGO (mismo criterio que router.py:2765). Decir «Bs» sobre un
          Zelle de $18,40 inducía a teclear la cifra convertida, y el backend la compara contra
          monto_usd: sobrepago astronómico ⇒ pago CONFIRMADO y pedido PAGADO con la deuda intacta.
          DIN-11.
          «EN TOTAL» no es adorno: verificar_monto PISA monto_recibido (router.py:2774), no suma
          abonos — si se entiende como «registrar el segundo abono», el primero desaparece. */}
      <span className="text-[13px] font-medium text-fg-muted">
        ¿Cuánto recibiste en total? {m.simbolo}
      </span>
      <input
        type="number"
        step="0.01"
        min="0"
        autoFocus
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={m.cobrado !== null ? String(m.cobrado) : "0.00"}
        className="focus-ring w-32 rounded-lg bg-bg px-3 py-1.5 text-sm text-fg ring-1 ring-borde"
      />
      <button
        onClick={onRegistrar}
        disabled={enviando || valor.trim() === ""}
        className="focus-ring rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
      >
        Registrar
      </button>
    </div>
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
  /** 🔴 EL ERROR DE UNA ACCIÓN NO PUEDE VIVIR DONDE VIVE EL DE CARGA. El banner de arriba se pinta
   * UNA vez, encima de la lista; con hasta 100 pagos de ~350px cada uno (router.py:2594), si la
   * dueña pulsa «Confirmar pago» en la tercera tarjeta hacia abajo el mensaje aparece FUERA de la
   * pantalla: ella ve un botón que se apaga, se enciende y no hace nada, y vuelve a pulsar. Y
   * tampoco basta con mover el texto: `cargar()` arranca con `setError("")`, así que cualquier
   * refresco borraría lo que se acaba de escribir. Los 409 del carril del dinero (pedido cancelado,
   * otro pago ya confirmado) traen la explicación COMPLETA de qué hacer: hay que poder leerla. */
  const [errorPago, setErrorPago] = useState<Record<number, string>>({});

  function cargar() {
    setError("");
    // Al cambiar de filtro las tarjetas de antes ya no se ven: sus errores tampoco deben quedarse.
    setErrorPago({});
    getPagos(filtro).then(setPagos).catch((e) => setError(e.message));
  }
  useEffect(cargar, [filtro]);

  function limpiarError(id: number) {
    setErrorPago((prev) => {
      if (!(id in prev)) return prev;
      const resto = { ...prev };
      delete resto[id];
      return resto;
    });
  }
  function fijarError(id: number, mensaje: string) {
    setErrorPago((prev) => ({ ...prev, [id]: mensaje }));
  }
  function marcarError(id: number, e: unknown, porDefecto: string) {
    fijarError(id, e instanceof Error ? e.message : porDefecto);
  }

  // Los cinco handlers escriben el fallo EN SU TARJETA. Y ninguno recarga la lista en el `catch`:
  // sería una carrera que borra el mensaje recién puesto (con el filtro «Por verificar», un pago
  // que ya estaba confirmado por otra vía desaparece de la lista y se lleva el texto dentro).
  async function confirmar(id: number) {
    limpiarError(id);
    setEnviando(id);
    try {
      await confirmarPago(id);
      cargar();
    } catch (e) {
      marcarError(id, e, "No se pudo confirmar");
    } finally {
      setEnviando(null);
    }
  }

  async function rechazar(id: number) {
    if (!window.confirm("¿Rechazar este pago? Se le pedirá al cliente revisarlo.")) return;
    limpiarError(id);
    setEnviando(id);
    try {
      await rechazarPago(id);
      cargar();
    } catch (e) {
      marcarError(id, e, "No se pudo rechazar");
    } finally {
      setEnviando(null);
    }
  }

  async function registrarMonto(id: number) {
    limpiarError(id);
    const n = Number(montoValor);
    if (!Number.isFinite(n) || n <= 0) {
      // También este va a la tarjeta: mandarlo al banner de arriba es justo el defecto que se está
      // arreglando, y encima este mensaje habla del input que la dueña tiene delante.
      fijarError(id, "Monto inválido: escribe cuánto recibiste, en números y mayor que 0.");
      return;
    }
    setEnviando(id);
    try {
      await verificarMonto(id, n);
      setMontoAbierto(null);
      setMontoValor("");
      cargar();
    } catch (e) {
      marcarError(id, e, "No se pudo registrar el monto");
    } finally {
      setEnviando(null);
    }
  }

  async function reabrir(id: number) {
    if (!window.confirm("¿Reabrir este pago? Volverá a Por verificar.")) return;
    limpiarError(id);
    setEnviando(id);
    try {
      await reabrirPago(id);
      cargar();
    } catch (e) {
      marcarError(id, e, "No se pudo reabrir");
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
    limpiarError(id);
    setEnviando(id);
    try {
      await anularPago(id);
      cargar();
    } catch (e) {
      marcarError(id, e, "No se pudo anular");
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
          {pagos.map((p) => {
            const m = moneda(p);
            const bloqueo = motivoBloqueo(p);
            // Cuando el comprobante trae MENOS de lo cobrado, el botón de acento pasa a ser «Monto
            // distinto» y «Confirmar pago» queda secundario: confirmar ahí regala la diferencia.
            // `faltante()` ya devuelve null si las monedas no calzan, así que un pago en dólares
            // leído como bolívares NO invierte nada (ver `mismaMoneda`).
            const faltaPlata = (faltante(p)?.dif ?? 0) < -0.01;
            return (
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
                    {/* En grande, lo COBRADO EN LA MONEDA DEL PAGO. Antes era `formatBs` fijo y
                        `formatBs(null)` devuelve «—» (format.ts): en un Zelle/Binance/efectivo
                        (`monto_bs` null, tools.py:2174) el número más gordo de la tarjeta —el que la
                        dueña usa para reconocer el pago de un vistazo— era un guion, y los $18,40
                        reales quedaban en gris a 13px. */}
                    <p className="text-lg font-extrabold num-snug text-fg tnum">{m.fmt(m.cobrado)}</p>
                    {/* La segunda línea solo tiene sentido en los pagos en bolívares: en divisas
                        sería el MISMO importe que ya está arriba. Y el equivalente en Bs no se pinta
                        a propósito: calcularlo aquí sería inventar dinero en la pantalla. */}
                    {p.monto_bs !== null && (
                      <p className="text-[13px] font-medium text-fg-muted tnum">{formatUSD(p.monto_usd)}</p>
                    )}
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
                    <ErrorBanner mensaje={errorPago[p.id]} className="mb-0" />
                    {bloqueo ? (
                      <div className="rounded-xl bg-bg-subtle px-3.5 py-2.5 text-[13px] font-medium text-fg-muted ring-hair">
                        {bloqueo}
                      </div>
                    ) : (
                      <AvisoMonto pago={p} />
                    )}
                    <div className="flex flex-wrap gap-2">
                      {/* Confirmar y Monto distinto SOLO si el backend los va a aceptar. Rechazar
                          SIEMPRE: `rechazar_pago` (router.py:2709-2738) no tiene ninguno de los dos
                          guards y es justo lo que hay que hacer con un comprobante viejo de un pedido
                          cancelado. Esconderlo dejaba la tarjeta SIN NINGUNA acción posible y sin
                          forma de sacarla de la bandeja. */}
                      {!bloqueo && (
                        <button
                          onClick={() => confirmar(p.id)}
                          disabled={enviando === p.id}
                          className={`focus-ring flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition disabled:opacity-50 ${
                            faltaPlata
                              ? "bg-bg text-fg-muted ring-1 ring-borde hover:bg-bg-subtle"
                              : "bg-accent text-accent-fg hover:bg-accent-soft"
                          }`}
                        >
                          <Check className="h-4 w-4" strokeWidth={2} />
                          {enviando === p.id ? "Confirmando…" : "Confirmar pago"}
                        </button>
                      )}
                      {/* Sin monto cobrado no hay NADA contra qué comparar y verificar-monto responde
                          400 (router.py:2766-2771): pasa cuando el comprobante llegó sin cotización
                          viva y el Pago nació con monto_usd y monto_bs en null. Ahí solo caben
                          Confirmar o Rechazar; no se ofrece lo que solo puede acabar en error. */}
                      {!bloqueo && m.cobrado !== null && (
                        <button
                          onClick={() => {
                            const abriendo = montoAbierto !== p.id;
                            setMontoAbierto(abriendo ? p.id : null);
                            // Precargado con lo que la VISIÓN leyó en el comprobante: es exactamente
                            // el número que la dueña iba a teclear mirando la captura. Nunca se
                            // precarga lo COBRADO — ese es justo el número que NO va aquí.
                            setMontoValor(
                              abriendo && p.monto_recibido !== null ? String(p.monto_recibido) : "",
                            );
                          }}
                          disabled={enviando === p.id}
                          className={`focus-ring flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition disabled:opacity-50 ${
                            faltaPlata
                              ? "bg-accent text-accent-fg hover:bg-accent-soft"
                              : "bg-bg text-fg ring-1 ring-borde hover:bg-bg-subtle"
                          }`}
                        >
                          <Scale className="h-4 w-4" strokeWidth={2} />
                          Monto distinto
                        </button>
                      )}
                      <button
                        onClick={() => rechazar(p.id)}
                        disabled={enviando === p.id}
                        className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                        Rechazar
                      </button>
                    </div>

                    {/* El `!bloqueo` también aquí: la fila puede haber quedado abierta de antes y
                        registrar un monto sobre un pedido cancelado se come el mismo 409. */}
                    {!bloqueo && montoAbierto === p.id && (
                      <FilaMonto
                        pago={p}
                        valor={montoValor}
                        enviando={enviando === p.id}
                        onCambio={setMontoValor}
                        onRegistrar={() => registrarMonto(p.id)}
                      />
                    )}
                  </div>
                ) : p.estado === "parcial" ? (
                  <div className="space-y-3">
                    <p className="text-[12px] font-medium text-fg-muted tnum">
                      Recibido {m.fmt(p.monto_recibido)}
                      <Saldo pago={p} />
                      {p.confirmado_por ? ` (${p.confirmado_por})` : ""}
                    </p>
                    <ErrorBanner mensaje={errorPago[p.id]} className="mb-0" />
                    {bloqueo ? (
                      <p className="text-[12px] font-medium text-fg-muted">{bloqueo}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => reabrir(p.id)}
                          disabled={enviando === p.id}
                          className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4" strokeWidth={2} />
                          Reabrir
                        </button>
                        {/* verificar-monto ya admite 'parcial' (router.py:2753). Sin este botón,
                            corregir un Bs 5,00 tecleado en vez de Bs 5.000 obligaba a Reabrir — que
                            además borra motivo_rechazo y devuelve el pago a la bandeja. */}
                        {m.cobrado !== null && (
                          <button
                            onClick={() => {
                              const abriendo = montoAbierto !== p.id;
                              setMontoAbierto(abriendo ? p.id : null);
                              setMontoValor(
                                abriendo && p.monto_recibido !== null ? String(p.monto_recibido) : "",
                              );
                            }}
                            disabled={enviando === p.id}
                            className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                          >
                            <Scale className="h-4 w-4" strokeWidth={2} />
                            Corregir el monto
                          </button>
                        )}
                      </div>
                    )}
                    {!bloqueo && montoAbierto === p.id && (
                      <FilaMonto
                        pago={p}
                        valor={montoValor}
                        enviando={enviando === p.id}
                        onCambio={setMontoValor}
                        onRegistrar={() => registrarMonto(p.id)}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[12px] font-medium text-fg-muted tnum">
                      {p.estado === "confirmado" ? "Confirmado" : "Rechazado"}
                      {p.confirmado_por ? ` por ${p.confirmado_por}` : ""}
                      {/* Ahora también dice «· faltan X» en un confirmado corto, no solo el sobrepago:
                          es el rastro de auditoría de DIN-3 sobre un pago que se cerró de golpe. */}
                      {p.estado === "confirmado" && <Saldo pago={p} />}
                    </p>
                    <ErrorBanner mensaje={errorPago[p.id]} className="mb-0" />
                    {p.estado === "rechazado" &&
                      (bloqueo ? (
                        // Reabrir SÍ funciona aunque el pedido esté cobrado o cancelado (reabrir_pago
                        // no tiene guards), y ese es el problema: deja el pago servido para un
                        // «Confirmar pago» que se estrella contra el 409. Callejón sin salida.
                        <p className="text-[12px] font-medium text-fg-muted">{bloqueo}</p>
                      ) : (
                        <button
                          onClick={() => reabrir(p.id)}
                          disabled={enviando === p.id}
                          className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4" strokeWidth={2} />
                          Reabrir
                        </button>
                      ))}
                    {/* Anular NUNCA se bloquea: es la salida de emergencia del carril del dinero y,
                        además, lo que el propio mensaje de bloqueo manda hacer con el otro pago. */}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
