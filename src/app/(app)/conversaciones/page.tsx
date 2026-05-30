"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { getConversaciones, getMensajes, type Conversacion, type Mensaje } from "@/lib/api";

export default function ConversacionesPage() {
  const [convs, setConvs] = useState<Conversacion[] | null>(null);
  const [activa, setActiva] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getConversaciones().then(setConvs).catch((e) => setError(e.message));
  }, []);

  function abrir(telefono: string) {
    setActiva(telefono);
    getMensajes(telefono).then(setMensajes).catch((e) => setError(e.message));
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Conversaciones</h1>
        <p className="text-sm text-fg-muted mt-1">Los chats de WhatsApp con tus clientes</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {convs === null ? (
        <div className="h-64 rounded-2xl bg-bg border border-borde animate-pulse" />
      ) : convs.length === 0 ? (
        <div className="rounded-2xl border border-borde bg-bg p-12 text-center">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-bg-subtle flex items-center justify-center mb-4">
            <MessageCircle className="h-5 w-5 text-fg-muted/60" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-fg">Aún no hay conversaciones</p>
          <p className="text-sm text-fg-muted mt-1">
            Aparecerán cuando los clientes escriban por WhatsApp.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            {convs.map((c) => (
              <button
                key={c.telefono}
                onClick={() => abrir(c.telefono)}
                className={`w-full text-left rounded-xl border p-3 transition-all duration-200 ${
                  activa === c.telefono
                    ? "border-accent bg-bg shadow-sm"
                    : "border-borde bg-bg hover:border-fg-muted/30"
                }`}
              >
                <p className="text-sm font-medium text-fg truncate">{c.nombre || c.telefono}</p>
                <p className="text-[13px] text-fg-muted truncate mt-0.5">{c.ultimo_mensaje || "—"}</p>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 bg-bg rounded-2xl border border-borde p-5 min-h-[420px]">
            {activa ? (
              <div className="space-y-2.5">
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex ${m.rol === "assistant" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        m.rol === "assistant"
                          ? "bg-accent text-accent-fg rounded-br-md"
                          : "bg-bg-subtle text-fg rounded-bl-md"
                      }`}
                    >
                      {m.contenido}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-fg-muted">Elige una conversación para verla</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
