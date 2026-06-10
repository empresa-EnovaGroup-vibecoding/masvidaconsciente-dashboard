"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Send, RotateCcw, Lock } from "lucide-react";
import { getPersonalidad, guardarPersonalidad, probarBot } from "@/lib/api";

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

  useEffect(() => {
    getPersonalidad()
      .then((p) => {
        setTexto(p.personalidad);
        setOriginal(p.default);
      })
      .catch((e) => setErrorP(e.message));
  }, []);

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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Mi Bot</h1>
        <p className="text-sm text-fg-muted mt-1">
          Ajusta cómo habla tu asistente y pruébalo en vivo, sin gastar WhatsApp.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Personalidad ── */}
        <section className="bg-bg rounded-2xl border border-borde p-5 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-fg mb-1">Personalidad</h2>
          <p className="text-[12px] text-fg-muted mb-3 leading-relaxed">
            Escribe en tus palabras cómo debe ser tu asistente: su tono, qué resaltar, cómo cerrar la venta.
          </p>

          {errorP && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {errorP}
            </div>
          )}

          {texto === null ? (
            <div className="h-72 rounded-xl bg-bg-subtle border border-borde animate-pulse" />
          ) : (
            <textarea
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setGuardado(false);
              }}
              className="w-full h-72 rounded-xl border border-borde bg-bg px-3.5 py-3 text-[13px] leading-relaxed text-fg resize-y focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              placeholder="Cómo habla tu asistente…"
            />
          )}

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button
              onClick={guardar}
              disabled={guardando || texto === null}
              className="inline-flex items-center gap-2 rounded-lg bg-accent text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => {
                setTexto(original);
                setGuardado(false);
              }}
              disabled={texto === null}
              className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} />
              Restaurar original
            </button>
            {guardado && !guardando && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                <Check className="h-4 w-4" strokeWidth={2} />
                Guardado
              </span>
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-bg-subtle/60 border border-borde p-3">
            <Lock className="h-4 w-4 text-fg-muted mt-0.5 shrink-0" strokeWidth={1.8} />
            <p className="text-[12px] text-fg-muted leading-relaxed">
              Las <span className="font-medium text-fg">reglas del cobro</span> (precios reales, nunca
              confirmar un pago solo, etc.) están <span className="font-medium text-fg">protegidas</span> y
              no se editan aquí — para que nunca puedas romper el cobro sin querer.
            </p>
          </div>
        </section>

        {/* ── Simulador ── */}
        <section className="bg-bg rounded-2xl border border-borde p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-fg">Probar el bot</h2>
              <p className="text-[12px] text-fg-muted">Escríbele como si fueras un cliente.</p>
            </div>
            {mensajes.length > 0 && (
              <button
                onClick={() => setMensajes([])}
                className="text-[12px] text-fg-muted hover:text-fg transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[300px] max-h-[360px] overflow-y-auto rounded-xl bg-bg-subtle/40 border border-borde p-3 space-y-2.5">
            {mensajes.length === 0 && !pensando ? (
              <div className="h-full flex items-center justify-center text-center px-6">
                <p className="text-[13px] text-fg-muted">
                  Escribe abajo (ej. <span className="italic">&quot;hola, ¿qué tienen?&quot;</span>) y mira cómo responde.
                </p>
              </div>
            ) : (
              <>
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex ${m.rol === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                        m.rol === "user"
                          ? "bg-accent text-white rounded-br-md"
                          : "bg-bg text-fg border border-borde rounded-bl-md"
                      }`}
                    >
                      {m.texto}
                    </div>
                  </div>
                ))}
                {pensando && (
                  <div className="flex justify-start">
                    <div className="bg-bg border border-borde rounded-2xl rounded-bl-md px-3.5 py-2 text-[13px] text-fg-muted">
                      escribiendo…
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={finChat} />
          </div>

          {errorS && <div className="mt-2 text-[12px] text-red-600">{errorS}</div>}

          <div className="flex items-center gap-2 mt-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviar();
              }}
              disabled={pensando}
              placeholder="Escribe un mensaje de prueba…"
              className="flex-1 rounded-lg border border-borde bg-bg px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:opacity-50"
            />
            <button
              onClick={enviar}
              disabled={pensando || input.trim() === ""}
              className="inline-flex items-center justify-center rounded-lg bg-accent text-white p-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
