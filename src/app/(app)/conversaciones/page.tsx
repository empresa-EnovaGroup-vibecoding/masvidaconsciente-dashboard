"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageCircle, Bot, Trash2, Send, User, AlertTriangle, Clock,
  Lock, Search, X, CheckSquare,
} from "lucide-react";
import {
  getConversaciones,
  getMensajes,
  getEstadoConversacion,
  getResumenChats,
  marcarLeido,
  responderCliente,
  pausarBotCliente,
  marcarContactoPrivado,
  borrarConversacion,
  devolverChatsAlBot,
  escucharEventosConversaciones,
  type Conversacion,
  type Mensaje,
  type EstadoConversacion,
  type ResumenChats,
  type FiltroConversaciones,
} from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { Adjunto } from "@/components/adjunto";

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

const FILTROS: { id: FiltroConversaciones; label: string; cuenta?: keyof ResumenChats }[] = [
  { id: "todos", label: "Todos", cuenta: "chats_total" },
  { id: "no_leidos", label: "No leídos", cuenta: "chats_sin_leer" },
  { id: "bot", label: "Alejandra atiende", cuenta: "bot_activo" },
  { id: "mios", label: "Atiendo yo", cuenta: "chats_tomados" },
  { id: "ayuda", label: "Necesitan ayuda", cuenta: "bot_pide_ayuda" },
  { id: "privados", label: "Privados", cuenta: "privados" },
];

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
  const [cambiandoPrivado, setCambiandoPrivado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [resumen, setResumen] = useState<ResumenChats | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtro, setFiltro] = useState<FiltroConversaciones>("todos");
  const [seleccionando, setSeleccionando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [devolviendoLote, setDevolviendoLote] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  const cargar = useCallback(() => {
    getConversaciones({ q: busquedaAplicada, filtro })
      .then((c) => { setConvs(c); setError(""); })
      .catch((e) => { setError((e as Error).message); });
    // Cuántos chats tienes tomados. La pausa NO caduca sola (así lo decidiste): sin este
    // aviso, un "ya te escribo" desde el celular deja el bot mudo en ese chat para siempre.
    getResumenChats().then(setResumen).catch(() => { /* el aviso es secundario */ });
  }, [busquedaAplicada, filtro]);

  useEffect(() => {
    cargar();
  }, [busqueda]);

  useEffect(() => {
    const id = window.setTimeout(() => setBusquedaAplicada(busqueda.trim()), 250);
    return () => window.clearTimeout(id);
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
  }, [activa, cargarHilo]);

  // Una conexión abierta y silenciosa reemplaza cuatro peticiones cada 3 segundos. Solo se
  // vuelve a pedir información cuando Redis avisa que algo cambió; si la red cae, reconecta.
  useEffect(() => {
    let detenido = false;
    let controlador: AbortController | null = null;
    let espera: number | null = null;

    async function conectar() {
      while (!detenido) {
        controlador = new AbortController();
        try {
          setEnVivo(true);
          await escucharEventosConversaciones((evento) => {
            cargar();
            if (!evento.telefono || evento.telefono === activa) cargarHilo();
          }, controlador.signal);
        } catch (e) {
          if (!controlador.signal.aborted) setEnVivo(false);
        }
        if (detenido) break;
        await new Promise<void>((resolve) => {
          espera = window.setTimeout(resolve, 3000);
        });
        cargar();
        cargarHilo();
      }
    }

    void conectar();
    const alVolver = () => {
      if (document.visibilityState === "visible") {
        cargar();
        cargarHilo();
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      detenido = true;
      controlador?.abort();
      if (espera !== null) window.clearTimeout(espera);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activa, cargar, cargarHilo]);

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
  // CONTACTO PRIVADO: no es un cliente. Es independiente de la pausa (un chat puede estar
  // privado Y tomado a la vez), por eso no entra en las dos constantes de arriba.
  const esPrivado = estado?.privado ?? convActiva?.privado ?? false;
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
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCambiandoPausa(false);
    }
  }

  async function togglePrivado() {
    if (!activa) return;
    // Se confirma solo al ENCENDER: es lo que tiene consecuencia (el bot deja de atender a ese
    // número para siempre y sus mensajes dejan de guardarse). Apagarlo devuelve las cosas a su
    // sitio y no necesita permiso.
    if (
      !esPrivado &&
      !window.confirm(
        "¿Marcar este chat como CONTACTO PRIVADO?\n\nEs para tu familia, tus amigos o los clientes de tu otro negocio. El bot dejará de responderle a este número, no le marcará el mensaje como leído y lo que ESA PERSONA te escriba ya NO se guardará aquí: lo lees en tu teléfono, como cualquier chat personal. (Lo que le contestes TÚ desde tu celular sí se sigue guardando, por ahora.)\n\nSi alguna vez te compra comida, quítale la marca primero. Puedes deshacerlo cuando quieras desde este mismo botón.",
      )
    )
      return;
    setCambiandoPrivado(true);
    setError("");
    try {
      await marcarContactoPrivado(activa, !esPrivado);
      setEstado(await getEstadoConversacion(activa));
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCambiandoPrivado(false);
    }
  }

  async function borrarChat() {
    if (!activa) return;
    if (
      !window.confirm(
        "¿Borrar este chat? Se eliminan los mensajes, los avisos de la bandeja y la memoria del bot (incluida la caché del cobro en curso) para este cliente. Sus pedidos y pagos NO se borran. Esto no se puede deshacer.",
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
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBorrando(false);
    }
  }

  const seleccionables = useMemo(
    () => (convs ?? []).filter((c) => c.bot_pausado && c.pausado_por !== "bot" && !c.privado),
    [convs],
  );

  function alternarSeleccion(telefono: string) {
    setSeleccionados((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(telefono)) siguientes.delete(telefono);
      else siguientes.add(telefono);
      return siguientes;
    });
  }

  function cerrarSeleccion() {
    setSeleccionando(false);
    setSeleccionados(new Set());
  }

  async function devolverSeleccionados() {
    const telefonos = Array.from(seleccionados);
    if (!telefonos.length || devolviendoLote) return;
    if (!window.confirm(
      `¿Devolver ${telefonos.length === 1 ? "este chat" : `estos ${telefonos.length} chats`} a Alejandra?\n\nEl bot podrá responder lo que el cliente dejó pendiente. Los demás chats no cambian.`,
    )) return;
    setDevolviendoLote(true);
    setError("");
    try {
      await devolverChatsAlBot(telefonos);
      cerrarSeleccion();
      cargar();
      if (activa && telefonos.includes(activa)) cargarHilo();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDevolviendoLote(false);
    }
  }

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">Conversaciones</h1>
          <p className="mt-1 text-[15px] font-medium text-fg-muted">
            Busca clientes y mira claramente quién está atendiendo cada chat.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-bg px-3 py-1.5 text-[12px] font-semibold text-fg-muted ring-hair">
          <span className={`h-2 w-2 rounded-full ${enVivo ? "bg-accent" : "bg-warn"}`} />
          {enVivo ? "Actualización en vivo" : "Reconectando…"}
        </span>
      </header>

      <ErrorBanner mensaje={error} />

      {!!resumen?.chats_tomados && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-warn-bg px-4 py-3 text-[13px] font-medium text-warn ring-1 ring-inset ring-warn-border">
          <User className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="min-w-0 flex-1">
            Tienes{" "}
            <span className="font-bold">
              {resumen.chats_tomados} {resumen.chats_tomados === 1 ? "chat" : "chats"}
            </span>{" "}
            atendidos por ti. Alejandra permanece en silencio únicamente en esos chats.
          </span>
          <button
            onClick={() => setFiltro("mios")}
            className="focus-ring shrink-0 rounded-lg bg-bg px-3 py-1.5 font-semibold text-warn ring-1 ring-inset ring-warn-border transition hover:bg-bg-subtle"
          >
            Ver y organizar
          </button>
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
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,2.05fr)]">
          <div className="flex min-h-[420px] min-w-0 max-h-[calc(100dvh-13rem)] flex-col overflow-hidden rounded-2xl bg-bg shadow-card ring-hair">
            <div className="shrink-0 border-b border-borde/60 p-3">
              <label className="relative block">
                <span className="sr-only">Buscar por nombre o teléfono</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" strokeWidth={2} />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar nombre o teléfono…"
                  className="focus-ring h-10 w-full rounded-xl bg-bg-subtle pl-9 pr-9 text-sm font-medium text-fg ring-1 ring-inset ring-borde placeholder:text-fg-muted"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-fg-muted hover:text-fg"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="Filtrar conversaciones">
                {FILTROS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFiltro(f.id);
                      cerrarSeleccion();
                    }}
                    className={`focus-ring shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition ${
                      filtro === f.id
                        ? "bg-accent text-accent-fg"
                        : "bg-bg text-fg-muted ring-1 ring-inset ring-borde hover:bg-bg-subtle"
                    }`}
                  >
                    {f.label}{f.cuenta && resumen ? ` ${resumen[f.cuenta]}` : ""}
                  </button>
                ))}
              </div>
              {seleccionando ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-bg-subtle px-2.5 py-2">
                  <span className="text-[12px] font-semibold text-fg-muted">{seleccionados.size} elegidos</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => void devolverSeleccionados()}
                      disabled={!seleccionados.size || devolviendoLote}
                      className="focus-ring rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-accent-fg disabled:opacity-40"
                    >
                      {devolviendoLote ? "Devolviendo…" : "Devolver al bot"}
                    </button>
                    <button onClick={cerrarSeleccion} className="focus-ring rounded-lg px-2 py-1.5 text-[11px] font-semibold text-fg-muted hover:bg-bg">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : seleccionables.length > 0 ? (
                <button
                  onClick={() => setSeleccionando(true)}
                  className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/10"
                >
                  <CheckSquare className="h-3.5 w-3.5" /> Seleccionar chats para devolver
                </button>
              ) : null}
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-borde/60 overflow-y-auto">
              {convs.length === 0 && (
                <li className="px-5 py-10 text-center">
                  <MessageCircle className="mx-auto h-6 w-6 text-fg-muted" strokeWidth={1.7} />
                  <p className="mt-2 text-sm font-semibold text-fg">No encontramos conversaciones</p>
                  <p className="mt-1 text-[12px] font-medium text-fg-muted">Prueba otro nombre, teléfono o filtro.</p>
                </li>
              )}
              {convs.map((c) => {
                const seleccionada = activa === c.telefono;
                const elegible = c.bot_pausado && c.pausado_por !== "bot" && !c.privado;
                return (
                  <li key={c.telefono} className="relative overflow-hidden">
                    {seleccionada && <span className="absolute left-0 top-0 h-full w-1 bg-accent" />}
                    <div
                      className={`flex w-full items-center gap-3 px-4 py-3 transition-colors ${
                        seleccionada ? "bg-bg-subtle/50" : "hover:bg-bg-subtle/50"
                      }`}
                    >
                      {seleccionando && elegible && (
                        <input
                          type="checkbox"
                          checked={seleccionados.has(c.telefono)}
                          onChange={() => alternarSeleccion(c.telefono)}
                          aria-label={`Seleccionar ${c.nombre || c.telefono}`}
                          className="focus-ring h-4 w-4 shrink-0 rounded border-borde text-accent"
                        />
                      )}
                      <button onClick={() => abrir(c.telefono)} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                        {(c.nombre || c.telefono || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 flex-1 truncate font-bold text-fg">{c.nombre || c.telefono}</p>
                          {!!c.no_leidos && (
                            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg tnum">
                              {c.no_leidos}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[13px] font-medium text-fg-muted">{c.ultimo_mensaje || "—"}</p>
                        <p className={`mt-1 truncate text-[11px] font-semibold ${
                          c.privado ? "text-fg-muted" : c.bot_pausado ? "text-warn" : "text-accent"
                        }`}>
                          {c.privado
                            ? "Privado · el bot no responde"
                            : c.bot_pausado && c.pausado_por === "bot"
                              ? "Alejandra pidió ayuda"
                              : c.bot_pausado
                                ? "Bot pausado · atiendes tú"
                                : "Alejandra atiende"}
                        </p>
                      </div>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex min-h-[420px] min-w-0 max-h-[calc(100dvh-13rem)] flex-col overflow-hidden rounded-2xl bg-bg p-4 shadow-card ring-hair sm:p-6">
            {activa ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-borde/60 pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                      {(convActiva?.nombre || activa || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-fg">{convActiva?.nombre || activa}</p>
                      <p className="truncate text-[12px] font-medium text-fg-muted">{activa}</p>
                      <p className={`mt-0.5 text-[11px] font-semibold ${esPrivado ? "text-fg-muted" : pausado ? "text-warn" : "text-accent"}`}>
                        {esPrivado
                          ? "Privado · el bot no responde"
                          : elBotPideAyuda
                            ? "Alejandra pidió ayuda"
                            : loTomeYo
                              ? "Bot pausado · atiendes tú"
                              : "Alejandra atiende"}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
                    {/* CONTACTO PRIVADO. Va AQUÍ, en la cabecera del chat, y no en una pantalla de
                        ajustes: ella se da cuenta de que ese número es su tía LEYENDO EL CHAT, y
                        el arreglo tiene que estar donde se da cuenta. Encendido se pinta como el
                        botón activo (mismo lenguaje que "Devolver al bot"). */}
                    <button
                      onClick={togglePrivado}
                      disabled={cambiandoPrivado}
                      title={
                        esPrivado
                          ? "Quitar la marca de privado: el bot volverá a atender este número"
                          : "Marcar como privado: es familia/amigos, el bot no debe responderle"
                      }
                      className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                        esPrivado
                          ? "bg-accent text-accent-fg hover:bg-accent-soft"
                          : "bg-bg text-fg ring-1 ring-borde hover:bg-bg-subtle"
                      }`}
                    >
                      <Lock className="h-4 w-4" strokeWidth={1.8} />
                      {cambiandoPrivado ? "…" : esPrivado ? "Es privado" : "Privado"}
                    </button>
                    <button
                      onClick={borrarChat}
                      disabled={borrando}
                      title="Borrar este chat"
                      className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-fg-muted ring-1 ring-borde transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
                {esPrivado && (
                  <div className="mb-4 rounded-xl bg-bg-subtle px-3 py-2.5 text-[13px] font-medium text-fg-muted ring-1 ring-inset ring-borde">
                    <span className="font-semibold">Este es un contacto privado.</span> El bot no le
                    responde y lo que <span className="font-semibold">esa persona</span> te escriba no se guarda
                    aquí: lo lees en tu teléfono. Si algún día te compra, quítale la marca con el botón{" "}
                    <span className="font-semibold">Es privado</span>.
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
                                className={`break-words rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
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
