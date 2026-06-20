"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Send, RotateCcw, Lock, Power } from "lucide-react";
import {
  getPersonalidad,
  guardarPersonalidad,
  probarBot,
  getBotEstado,
  guardarBotEstado,
} from "@/lib/api";
import { ErrorBanner } from "@/components/error-banner";

type MsgSim = { rol: "user" | "assistant"; texto: string };

export default function BotPage() {
  // ── Personalidad ──
  const [texto, setTexto] = useState<string | null>(null);
  const [original, setOriginal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorP, setErrorP] = useState("");

  // ── Simulador ──
  const [mensajes, setMensajes] = useState<MsgSim[]>([]);
  const [input, setInput] = useState("");
  const [pensando, setPensando] = useState(false);
  const [errorS, setErrorS] = useState("");
  const finChat = useRef<HTMLDivElement>(null);

  // Interruptor del bot
  const [botActivo, setBotActivo] = useState<boolean | null>(null);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    getPersonalidad()
      .then((p) => {
        setTexto(p.personalidad);
        setOriginal(p.default);
      })
      .catch((e) => setErrorP(e.message));
    getBotEstado()
      .then((e) => setBotActivo(e.activo))
      .catch(() => {});
  }, []);

  async function toggleBot() {
    if (botActivo === null) return;
    setCambiando(true);
    try {
      const r = await guardarBotEstado(!botActivo);
      setBotActivo(r.activo);
    } catch (e) {
      setErrorP((e as Error).message);
    } finally {
      setCambiando(false);
    }
  }

  useEffect(() => {
    finChat.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, pensando]);

  async function guardar() {
    if (texto === null) return;
    setGuardando(true);
    setErrorP("");
    try {
      await guardarPersonalidad(texto);
      setGuardado(true);
    } catch (e) {
      setErrorP((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function enviar() {
    const txt = input.trim();
    if (!txt || pensando) return;
    const historial = mensajes.map((m) => ({ role: m.rol, content: m.texto }));
    setMensajes((prev) => [...prev, { rol: "user", texto: txt }]);
    setInput("");
    setPensando(true);
    setErrorS("");
    try {
      const { respuesta } = await probarBot(txt, historial);
      setMensajes((prev) => [...prev, { rol: "assistant", texto: respuesta }]);
    } catch (e) {
      setErrorS((e as Error).message);
    } finally {
      setPensando(false);
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[26px] font-extrabold num-tight text-fg">Mi Bot</h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Ajusta cómo habla tu asistente y pruébalo en vivo, sin gastar WhatsApp.
        </p>
      </header>

      {/* Interruptor del bot */}
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-bg p-5 shadow-card ring-hair">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${botActivo === false ? "bg-red-500" : "bg-accent"}`}
          />
          <div>
            <p className="text-sm font-semibold text-fg">
              {botActivo === null ? "Cargando…" : botActivo ? "Bot encendido" : "Bot apagado"}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-fg-muted">
              {botActivo === false
                ? "No responde solo. Los mensajes te llegan para que respondas tú; los pagos siguen entrando."
                : "Responde automáticamente a tus clientes por WhatsApp."}
            </p>
          </div>
        </div>
        <button
          onClick={toggleBot}
          disabled={cambiando || botActivo === null}
          className={
            botActivo === false
              ? "focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
              : "focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl bg-bg px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
          }
        >
          <Power className="h-4 w-4" strokeWidth={2} />
          {cambiando ? "…" : botActivo === false ? "Encender" : "Apagar"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Personalidad ── */}
        <section className="flex flex-col rounded-2xl bg-bg p-6 shadow-card ring-hair">
          <h2 className="text-lg font-semibold num-snug text-fg">Personalidad</h2>
          <p className="mt-1 mb-4 text-sm font-medium leading-relaxed text-fg-muted">
            Escribe en tus palabras cómo debe ser tu asistente: su tono, qué resaltar, cómo cerrar la venta.
          </p>

          <ErrorBanner mensaje={errorP} className="mb-4" />

          {texto === null ? (
            <div className="h-72 animate-pulse rounded-xl bg-bg-subtle ring-hair" />
          ) : (
            <textarea
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setGuardado(false);
              }}
              aria-label="Personalidad del bot"
              className="focus-ring h-72 w-full resize-y rounded-xl bg-bg px-3 py-2 text-sm leading-relaxed text-fg ring-1 ring-borde placeholder:text-fg-faint"
              placeholder="Cómo habla tu asistente…"
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={guardar}
              disabled={guardando || texto === null}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => {
                setTexto(original);
                setGuardado(false);
              }}
              disabled={texto === null}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-bg px-4 py-2.5 text-sm font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
              Restaurar original
            </button>
            {guardado && !guardando && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                <Check className="h-4 w-4" strokeWidth={2} />
                Guardado
              </span>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-bg-subtle/60 p-4 ring-hair">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" strokeWidth={1.8} />
            <p className="text-[13px] font-medium leading-relaxed text-fg-muted">
              Las <span className="font-semibold text-fg">reglas del cobro</span> (precios reales, nunca
              confirmar un pago solo, etc.) están <span className="font-semibold text-fg">protegidas</span> y
              no se editan aquí — para que nunca puedas romper el cobro sin querer.
            </p>
          </div>
        </section>

        {/* ── Simulador ── */}
        <section className="flex flex-col rounded-2xl bg-bg p-6 shadow-card ring-hair">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold num-snug text-fg">Probar el bot</h2>
              <p className="mt-1 text-sm font-medium text-fg-muted">Escríbele como si fueras un cliente.</p>
            </div>
            {mensajes.length > 0 && (
              <button
                onClick={() => setMensajes([])}
                className="focus-ring rounded-lg px-2 py-1 text-[13px] font-semibold text-fg-muted transition hover:text-fg"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="max-h-[360px] min-h-[300px] flex-1 space-y-2.5 overflow-y-auto rounded-xl bg-bg-subtle/40 p-3 ring-hair">
            {mensajes.length === 0 && !pensando ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <p className="text-sm font-medium text-fg-muted">
                  Escribe abajo (ej. <span className="italic">&quot;hola, ¿qué tienen?&quot;</span>) y mira cómo responde.
                </p>
              </div>
            ) : (
              <>
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex ${m.rol === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        m.rol === "user"
                          ? "rounded-br-md bg-accent font-medium text-accent-fg"
                          : "rounded-bl-md bg-bg text-fg ring-hair"
                      }`}
                    >
                      {m.texto}
                    </div>
                  </div>
                ))}
                {pensando && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-bg px-3.5 py-2 text-[13px] font-medium text-fg-muted ring-hair">
                      escribiendo…
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={finChat} />
          </div>

          <ErrorBanner mensaje={errorS} className="mt-3" />

          <div className="mt-3 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) enviar();
              }}
              disabled={pensando}
              aria-label="Mensaje de prueba"
              placeholder="Escribe un mensaje de prueba…"
              className="focus-ring w-full flex-1 rounded-xl bg-bg px-3 py-2.5 text-sm text-fg ring-1 ring-borde placeholder:text-fg-faint disabled:opacity-50"
            />
            <button
              onClick={enviar}
              disabled={pensando || input.trim() === ""}
              aria-label="Enviar mensaje de prueba"
              className="focus-ring inline-flex items-center justify-center rounded-xl bg-accent p-2.5 text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
