"use client";

import { useEffect, useState } from "react";
import { getConversaciones, getMensajes, type Conversacion, type Mensaje } from "@/lib/api";

export default function ConversacionesPage() {
  const [convs, setConvs] = useState<Conversacion[]>([]);
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
      <h1 className="text-2xl font-semibold text-marca-900 mb-1">Conversaciones</h1>
      <p className="text-marca-600 mb-6">Los chats de WhatsApp con tus clientes</p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {convs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-marca-100 p-10 text-center text-marca-600">
          Aún no hay conversaciones. Aparecerán cuando los clientes escriban por WhatsApp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            {convs.map((c) => (
              <button
                key={c.telefono}
                onClick={() => abrir(c.telefono)}
                className={`w-full text-left bg-white rounded-xl border p-3 transition ${
                  activa === c.telefono ? "border-marca-500" : "border-marca-100 hover:border-marca-300"
                }`}
              >
                <p className="font-medium text-marca-900">{c.nombre || c.telefono}</p>
                <p className="text-sm text-marca-600 truncate">{c.ultimo_mensaje || "—"}</p>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-marca-100 p-5 min-h-[400px]">
            {activa ? (
              <div className="space-y-3">
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex ${m.rol === "assistant" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        m.rol === "assistant" ? "bg-marca-600 text-white" : "bg-marca-50 text-marca-900"
                      }`}
                    >
                      {m.contenido}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-marca-600 text-center mt-20">Elige una conversación para verla</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
