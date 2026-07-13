"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Bot, Trash2, Send, User, AlertTriangle, Clock, FileText, HandHelping } from "lucide-react";
import {
  getConversaciones,
  getMensajes,
  getEstadoConversacion,
  getMediaMensajeUrl,
  getResumenChats,
  marcarLeido,
  responderCliente,
  pausarBotCliente,
  borrarConversacion,
  type Conversacion,
  type Mensaje,
  type EstadoConversacion,
  type ResumenChats,
} from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

/** "4 h 12 min" — lo que le queda para poder escribirle (la regla de las 24h de WhatsApp). */
function restante(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m} min`;
}

function hora(fecha: string): string {
  return new Date(fecha).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
}

/**
 * El archivo que mandó el cliente (el comprobante del pago), DENTRO del chat.
 * Se descarga con el token y se pinta como blob: un <img src> directo daría 401, y el
 * comprobante es privado (trae datos bancarios). Un PDF no se puede pintar: va como enlace.
 */
function Adjunto({ mensajeId }: { mensajeId: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [esPdf, setEsPdf] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    let creada: string | null = null;
    getMediaMensajeUrl(mensajeId)
      .then(({ url: u, esPdf: pdf }) => {
        if (!vivo) { URL.revokeObjectURL(u); return; }
        creada = u;
        setUrl(u);
        setEsPdf(pdf);
      })
      .catch(() => { if (vivo) setError(true); });
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);  // sin esto, el navegador se llena de memoria
    };
  }, [mensajeId]);

  if (error) {
    return <p className="text-[12px] font-medium text-fg-muted">No se pudo cargar el archivo.</p>;
  }
  if (!url) {
    return <div className="h-40 w-52 animate-pulse rounded-xl bg-bg-subtle" />;
  }
  if (!esPdf) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="focus-ring block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Comprobante" className="max-h-56 rounded-xl object-contain ring-hair" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-bg px-3 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde hover:bg-bg-subtle"
    >
      <FileText className="h-4 w-4" strokeWidth={1.8} />
      Abrir el comprobante
    </a>
  );
}

/** `useSearchParams` obliga a un Suspense en Next 15: si no, el build falla. */
export default function ConversacionesPage() {
  return (
    <Suspense fallback={<div className="h-[420px] animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />}>
      <Conversaciones />
    </Suspense>
  );
}

function Conversaciones() {
  // Se llega aquí desde "El bot te necesita" con ?tel=… → ese chat se abre solo.
  const params = useSearchParams();
  const telDeLaBandeja = params.get("tel");

  const [convs, setConvs] = useState<Conversacion[] | null>(null);
  const [activa, setActiva] = useState<string | null>(telDeLaBandeja);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [estado, setEstado] = useState<EstadoConversacion | null>(null);
  const [borrador, setBorrador] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [error, setError] = useState("");
  const [errorHilo, setErrorHilo] = useState("");
  const [cambiandoPausa, setCambiandoPausa] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [resumen, setResumen] = useState<ResumenChats | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  const cargar = useCallback(() => {
    getConversaciones()
      .then((c) => { setConvs(c); setError(""); })
      .catch((e) => { setError((e as Error).message); });
    // Cuántos chats tienes tomados. La pausa NO caduca sola (así lo decidiste): sin este
    // aviso, un "ya te escribo" desde el celular deja el bot mudo en ese chat para siempre.
    getResumenChats().then(setResumen).catch(() => { /* el aviso es secundario */ });
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 7000);
    return () => { clearInterval(id); };
  }, [cargar]);

  // El hilo + si PUEDES escribirle ahora mismo (van juntos: sin lo segundo, la caja de texto
  // mentiría — te dejaría escribir un mensaje que WhatsApp va a rechazar).
  const cargarHilo = useCallback(() => {
    if (!activa) return;
    getMensajes(activa)
      .then((m) => { setMensajes(m); setErrorHilo(""); })
      .catch((e) => { setErrorHilo((e as Error).message); });
    getEstadoConversacion(activa)
      .then(setEstado)
      .catch(() => { /* el hilo se ve igual; solo se pierde el reloj */ });
  }, [activa]);

  useEffect(() => {
    if (!activa) return;
    cargarHilo();
    const id = setInterval(cargarHilo, 7000);
    return () => { clearInterval(id); };
  }, [activa, cargarHilo]);

  // Al abrir un chat o cuando entra un mensaje nuevo, baja solo al último (como WhatsApp).
  useEffect(() => {
    const el = scrollRef.current;
    if (el && mensajes.length !== prevLen.current) {
      el.scrollTop = el.scrollHeight;
      prevLen.current = mensajes.length;
    }
  }, [mensajes]);

  function abrir(telefono: string) {
    setActiva(telefono);
    setMensajes([]);
    setEstado(null);
    setBorrador("");
    setErrorEnvio("");
    setErrorHilo("");
    prevLen.current = 0;
    void marcarLeido(telefono).then(cargar).catch(() => { /* no es crítico */ });
  }

  const convActiva = convs?.find((c) => c.telefono === activa) ?? null;
  // El estado del endpoint manda (es el que sabe de verdad); la lista es el respaldo.
  const pausado = estado?.bot_pausado ?? convActiva?.bot_pausado ?? false;
  const porQuien = estado?.pausado_por ?? convActiva?.pausado_por ?? null;
  // Son dos cosas MUY distintas: "lo tomé yo" vs "el bot se calló porque me necesita".
  const loTomeYo = pausado && porQuien !== "bot";
  const elBotPideAyuda = pausado && porQuien === "bot";
  const ventana = estado?.ventana;
  const puedeEscribir = !!ventana?.abierta && !estado?.es_simulador;

  async function enviar() {
    const texto = borrador.trim();
    if (!activa || !texto || enviando) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      await responderCliente(activa, texto);
      setBorrador("");
      cargarHilo();  // el mensaje aparece en el hilo
      cargar();      // y el bot ya figura callado en la lista
    } catch (e) {
      setErrorEnvio((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function togglePausa() {
    if (!activa) return;
    setCambiandoPausa(true);
    try {
      await pausarBotCliente(activa, !pausado);
      cargarHilo();
      setConvs(await getConversaciones());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCambiandoPausa(false);
    }
  }

  async function borrarChat() {
    if (!activa) return;
    if (
      !window.confirm(
        "¿Borrar este chat? Se eliminan los mensajes y la memoria del bot para este cliente. Sus pedidos y pagos NO se borran. Esto no se puede deshacer.",
      )
    )
      return;
    setBorrando(true);
    setError("");
    try {
      await borrarConversacion(activa);
      setActiva(null);
      setMensajes([]);
      setEstado(null);
      prevLen.current = 0;
      setConvs(await getConversaciones());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBorrando(false);
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Conversaciones</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Los chats de WhatsApp con tus clientes. Puedes responder tú desde aquí.
        </p>
      </header>

      <ErrorBanner mensaje={error} />

      {!!resumen?.chats_tomados && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl bg-warn-bg px-4 py-3 text-[13px] font-medium text-warn ring-1 ring-inset ring-warn-border">
          <User className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span>
            El bot está callado en{" "}
            <span className="font-bold">
              {resumen.chats_tomados} {resumen.chats_tomados === 1 ? "chat" : "chats"}
            </span>{" "}
            porque los estás atendiendo tú. Ahí no responde a nadie hasta que le des{" "}
            <span className="font-semibold">Devolver al bot</span>.
          </span>
        </div>
      )}

      {error && convs === null ? (
        <ErrorState mensaje={error} onRetry={cargar} />
      ) : convs === null ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="overflow-hidden rounded-2xl bg-bg shadow-card ring-hair">
            <ul className="divide-y divide-borde/60">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="px-6 py-4">
                  <div className="h-9 w-full animate-pulse rounded-md bg-bg-subtle" />
                </li>
              ))}
            </ul>
          </div>
          <div className="h-[420px] animate-pulse rounded-2xl bg-bg shadow-card ring-hair md:col-span-2" />
        </div>
      ) : convs.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          titulo="Aún no hay conversaciones"
          texto="Aparecerán cuando los clientes escriban por WhatsApp."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="overflow-hidden rounded-2xl bg-bg shadow-card ring-hair">
            <ul className="divide-y divide-borde/60">
              {convs.map((c) => {
                const seleccionada = activa === c.telefono;
                return (
                  <li key={c.telefono} className="relative overflow-hidden">
                    {seleccionada && <span className="absolute left-0 top-0 h-full w-1 bg-accent" />}
                    <button
                      onClick={() => abrir(c.telefono)}
                      className={`focus-ring flex w-full items-center gap-4 px-6 py-4 text-left transition-colors ${
                        seleccionada ? "bg-bg-subtle/50" : "hover:bg-bg-subtle/50"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                        {(c.nombre || c.telefono || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate font-bold text-fg">{c.nombre || c.telefono}</p>
                        <p className="mt-0.5 truncate text-[13px] font-medium text-fg-muted">{c.ultimo_mensaje || "—"}</p>
                      </div>
                      {!!c.no_leidos && (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg tnum">
                          {c.no_leidos}
                        </span>
                      )}
                      {c.bot_pausado && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-semibold text-warn ring-1 ring-inset ring-warn-border">
                          {c.pausado_por === "bot" ? (
                            <><HandHelping className="h-3 w-3" strokeWidth={2} />Te necesita</>
                          ) : (
                            <><User className="h-3 w-3" strokeWidth={2} />Tú</>
                          )}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex min-h-[420px] flex-col rounded-2xl bg-bg p-6 shadow-card ring-hair md:col-span-2">
            {activa ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-borde/60 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                      {(convActiva?.nombre || activa || "?").charAt(0).toUpperCase()}
                    </div>
                    <p className="truncate font-bold text-fg">{convActiva?.nombre || activa}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={togglePausa}
                      disabled={cambiandoPausa}
                      className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                        pausado
                          ? "bg-accent text-accent-fg hover:bg-accent-soft"
                          : "bg-bg text-fg ring-1 ring-borde hover:bg-bg-subtle"
                      }`}
                    >
                      <Bot className="h-4 w-4" strokeWidth={1.8} />
                      {cambiandoPausa ? "…" : pausado ? "Devolver al bot" : "Yo atiendo"}
                    </button>
                    <button
                      onClick={borrarChat}
                      disabled={borrando}
                      title="Borrar este chat"
                      className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 ring-1 ring-red-600/20 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                      {borrando ? "Borrando…" : "Borrar"}
                    </button>
                  </div>
                </div>

                {loTomeYo && (
                  <div className="mb-4 rounded-xl bg-warn-bg px-3 py-2.5 text-[13px] font-medium text-warn ring-1 ring-inset ring-warn-border">
                    Este chat lo estás atendiendo <span className="font-semibold">tú</span>: el bot no le
                    responde. Los demás clientes siguen atendidos. Cuando termines, dale{" "}
                    <span className="font-semibold">Devolver al bot</span>.
                  </div>
                )}
                {elBotPideAyuda && (
                  <div className="mb-4 rounded-xl bg-warn-bg px-3 py-2.5 text-[13px] font-medium text-warn ring-1 ring-inset ring-warn-border">
                    <span className="font-semibold">El bot te necesita en este chat</span> y por eso dejó
                    de responder (ya le dijo al cliente que le confirmas en un momento). Contéstale tú y,
                    cuando termines, dale <span className="font-semibold">Devolver al bot</span>.
                  </div>
                )}

                {errorHilo && mensajes.length === 0 ? (
                  <ErrorState mensaje={errorHilo} onRetry={cargarHilo} embedded />
                ) : (
                  <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="space-y-2.5">
                      {mensajes.map((m, i) => {
                        const mio = m.rol === "owner";      // lo escribiste TÚ
                        const bot = m.rol === "assistant";  // lo escribió el bot
                        const fallido = m.estado === "fallido";
                        return (
                          <div key={m.id ?? i} className={`flex ${mio || bot ? "justify-end" : "justify-start"}`}>
                            <div className="max-w-[78%]">
                              <div
                                className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                                  fallido
                                    ? "rounded-br-md bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
                                    : mio
                                      ? "rounded-br-md bg-fg text-bg"
                                      : bot
                                        ? "rounded-br-md bg-accent text-accent-fg"
                                        : "rounded-bl-md bg-bg-subtle text-fg ring-1 ring-inset ring-borde"
                                }`}
                              >
                                {/* El comprobante del cliente, DENTRO del chat: hasta ahora este
                                    tramo del hilo estaba en blanco y había que responder a ciegas
                                    justo en el momento del dinero. */}
                                {m.tiene_media && m.id && (
                                  <div className="mb-1.5">
                                    <Adjunto mensajeId={m.id} />
                                  </div>
                                )}
                                {m.contenido}
                              </div>
                              <p
                                className={`mt-1 px-1 text-[11px] font-medium text-fg-muted ${
                                  mio || bot ? "text-right" : ""
                                }`}
                              >
                                {mio ? "Tú · " : bot ? "El bot · " : ""}
                                {hora(m.fecha)}
                                {fallido && <span className="ml-1 font-semibold text-red-600">· no se envió</span>}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LA CAJA DE TEXTO. Si WhatsApp no deja escribirle, se bloquea ANTES y se explica
                    por qué: nunca se intenta un envío que va a fallar (un envío rechazado le baja
                    la calidad al número, y eso arriesga la cuenta de Meta). */}
                <div className="mt-4 border-t border-borde/60 pt-4">
                  {errorEnvio && (
                    <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                      <span>{errorEnvio}</span>
                    </div>
                  )}

                  {estado?.es_simulador ? (
                    <p className="rounded-xl bg-bg-subtle px-3 py-2.5 text-[13px] font-medium text-fg-muted ring-1 ring-inset ring-borde">
                      Este es el chat de prueba del simulador: no hay un WhatsApp real del otro lado.
                    </p>
                  ) : ventana && !ventana.abierta ? (
                    <div className="rounded-xl bg-warn-bg px-3 py-2.5 text-[13px] font-medium text-warn ring-1 ring-inset ring-warn-border">
                      <p className="font-semibold">No puedes escribirle ahora.</p>
                      <p className="mt-0.5">
                        WhatsApp solo deja responder durante las 24 horas siguientes al último mensaje
                        del cliente, y ya pasaron. Cuando él vuelva a escribir, la caja se abre sola.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        <textarea
                          value={borrador}
                          onChange={(e) => setBorrador(e.target.value)}
                          onKeyDown={(e) => {
                            // Enter envía; Shift+Enter salta de línea (como WhatsApp Web).
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void enviar();
                            }
                          }}
                          rows={2}
                          placeholder="Escríbele al cliente…"
                          disabled={!puedeEscribir || enviando}
                          className="focus-ring min-h-[46px] flex-1 resize-none rounded-xl bg-bg px-3.5 py-2.5 text-[14px] font-medium text-fg ring-1 ring-inset ring-borde placeholder:text-fg-muted disabled:opacity-50"
                        />
                        <button
                          onClick={() => void enviar()}
                          disabled={!puedeEscribir || enviando || !borrador.trim()}
                          className="focus-ring inline-flex h-[46px] shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-40"
                        >
                          <Send className="h-4 w-4" strokeWidth={1.8} />
                          {enviando ? "Enviando…" : "Enviar"}
                        </button>
                      </div>
                      <p className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-fg-muted">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                        <span>
                          {ventana
                            ? `Tienes ${restante(ventana.minutos_restantes)} para responderle (WhatsApp cierra el chat a las 24 horas del último mensaje del cliente).`
                            : "Cargando…"}
                          {!pausado && " Al escribirle, el bot se calla solo en este chat."}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold text-fg">Elige una conversación</p>
                <p className="mt-1 text-sm font-medium text-fg-muted">Selecciónala en la lista para verla.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
