"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { getMediaMensajeUrl, type ClaseMedia } from "@/lib/api";

/**
 * El archivo de un mensaje del hilo (el comprobante que mandó el cliente, o la foto/video/PDF
 * que mandó el bot), DENTRO del chat.
 * Se descarga con el token y se pinta como blob: un <img src> directo daría 401, y el
 * comprobante es privado (trae datos bancarios). Un PDF no se puede pintar: va como enlace.
 *
 * Vive en `components/` porque lo usan DOS pantallas: la bandeja (Conversaciones) y el
 * simulador de "Mi Bot" — que enseña exactamente la misma media, para que probar el bot en el
 * panel se parezca a lo que el cliente ve en WhatsApp.
 */
export function Adjunto({ mensajeId }: { mensajeId: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [clase, setClase] = useState<ClaseMedia>("archivo");
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    let creada: string | null = null;
    getMediaMensajeUrl(mensajeId)
      .then(({ url: u, clase: c }) => {
        if (!vivo) { URL.revokeObjectURL(u); return; }
        creada = u;
        setUrl(u);
        setClase(c);
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
  if (clase === "imagen") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="focus-ring block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Adjunto" className="max-h-56 rounded-xl object-contain ring-hair" />
      </a>
    );
  }
  if (clase === "video") {
    // Antes NO existía esta rama: el bot ya podía mandarle VIDEOS de producto al cliente y en el
    // panel salían como un enlace gris de "comprobante". Ahora se reproducen aquí mismo.
    return (
      <video src={url} controls className="max-h-56 rounded-xl ring-hair" />
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
      Abrir el archivo
    </a>
  );
}
