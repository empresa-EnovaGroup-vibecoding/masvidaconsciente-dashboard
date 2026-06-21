"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Bot, Trash2 } from "lucide-react";
import {
  getConversaciones,
  getMensajes,
  pausarBotCliente,
  borrarConversacion,
  type Conversacion,
  type Mensaje,
} from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

export default function ConversacionesPage() {
  const [convs, setConvs] = useState<Conversacion[] | null>(null);
  const [activa, setActiva] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [error, setError] = useState("");
  const [errorHilo, setErrorHilo] = useState("");
  const [cambiandoPausa, setCambiandoPausa] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  // Carga la lista de conversaciones (reutilizable: efecto + botón Reintentar).
  const cargar = useCallback(() => {
    getConversaciones()
      .then((c) => { setConvs(c); setError(""); })
      .catch((e) => { setError((e as Error).message); });
  }, []);

  // Auto-refresco de la lista de conversaciones, casi en tiempo real (cada 7s).
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 7000);
    return () => { clearInterval(id); };
  }, [cargar]);

  // Carga los mensajes del chat abierto (reutilizable: efecto + botón Reintentar).
  const cargarHilo = useCallback(() => {
    if (!activa) return;
    getMensajes(activa)
      .then((m) => { setMensajes(m); setErrorHilo(""); })
      .catch((e) => { setErrorHilo((e as Error).message); });
  }, [activa]);

  // Auto-refresco de los mensajes de la conversacion ABIERTA: verla responder en vivo.
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
    setErrorHilo("");
    prevLen.current = 0;
  }

  const convActiva = convs?.find((c) => c.telefono === activa) ?? null;

  async function togglePausa() {
    if (!activa || !convActiva) return;
    setCambiandoPausa(true);
    try {
      await pausarBotCliente(activa, !convActiva.bot_pausado);
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
        <p className="mt-1 text-[15px] font-medium text-fg-muted">Los chats de WhatsApp con tus clientes</p>
      </header>

      <ErrorBanner mensaje={error} />

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
                      {c.bot_pausado && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-semibold text-warn ring-1 ring-inset ring-warn-border">
                          <Bot className="h-3 w-3" strokeWidth={2} />
                          Pausado
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="min-h-[420px] rounded-2xl bg-bg p-6 shadow-card ring-hair md:col-span-2">
            {activa ? (
              <div>
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-borde/60 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                      {(convActiva?.nombre || activa || "?").charAt(0).toUpperCase()}
                    </div>
                    <p className="truncate font-bold text-fg">
                      {convActiva?.nombre || activa}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={togglePausa}
                      disabled={cambiandoPausa}
                      className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                        convActiva?.bot_pausado
                          ? "bg-accent text-accent-fg hover:bg-accent-soft"
                          : "bg-bg text-fg ring-1 ring-borde hover:bg-bg-subtle"
                      }`}
                    >
                      <Bot className="h-4 w-4" strokeWidth={1.8} />
                      {cambiandoPausa
                        ? "…"
                        : convActiva?.bot_pausado
                          ? "Reactivar bot aquí"
                          : "Pausar bot aquí"}
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

                {convActiva?.bot_pausado && (
                  <div className="mb-4 rounded-xl bg-warn-bg px-3 py-2.5 text-[13px] font-medium text-warn ring-1 ring-inset ring-warn-border">
                    El bot está <span className="font-semibold">pausado en este chat</span> — respondes tú. Los
                    demás clientes siguen siendo atendidos.
                  </div>
                )}

                {errorHilo && mensajes.length === 0 ? (
                  <ErrorState mensaje={errorHilo} onRetry={cargarHilo} embedded />
                ) : (
                <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto pr-1">
                  <div className="space-y-2.5">
                  {mensajes.map((m, i) => (
                    <div key={i} className={`flex ${m.rol === "assistant" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                          m.rol === "assistant"
                            ? "rounded-br-md bg-accent text-accent-fg"
                            : "rounded-bl-md bg-bg-subtle text-fg ring-1 ring-inset ring-borde"
                        }`}
                      >
                        {m.contenido}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
                )}
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
