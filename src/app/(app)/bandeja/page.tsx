"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Check, MessageCircle, Quote, Tag, X } from "lucide-react";
import {
  getIntervenciones,
  resolverIntervencion,
  aplicarPropuesta,
  descartarPropuesta,
  getPreciosDia,
  guardarPrecioDia,
  type Intervencion,
  type EstadoIntervencion,
  type PrecioDiaProducto,
} from "@/lib/api";
import { formatUSD, formatFecha, formatHora } from "@/lib/format";
import { estiloMotivo } from "@/lib/estados";
import { inputCls } from "@/lib/ui";
import { ErrorBanner } from "@/components/error-banner";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

const FILTROS: { valor: EstadoIntervencion; etiqueta: string }[] = [
  { valor: "pendiente", etiqueta: "Te esperan" },
  { valor: "resuelta", etiqueta: "Ya atendidos" },
];

/** El chat de ese cliente, DENTRO del panel: ella responde aquí, no en su celular.
 * Devuelve null si no es un teléfono real (ej. las pruebas del simulador). */
function linkChat(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  return digitos.length >= 7 ? `/conversaciones?tel=${encodeURIComponent(telefono)}` : null;
}

/** El precio de HOY de los productos cuyo precio cambia de un día a otro
 * (tortas keto, premezclas…). Mientras no lo pongas, el bot NO lo inventa: te avisa. */
function PrecioDelDia({
  precios,
  onGuardado,
  onError,
}: {
  precios: PrecioDiaProducto[];
  onGuardado: () => void;
  onError: (mensaje: string) => void;
}) {
  const [valores, setValores] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState<number | null>(null);

  async function guardar(p: PrecioDiaProducto) {
    const n = Number(valores[p.variante_id]);
    if (!Number.isFinite(n) || n <= 0) {
      onError("Escribe un precio mayor que 0.");
      return;
    }
    setGuardando(p.variante_id);
    try {
      await guardarPrecioDia(p.variante_id, n);
      setValores((v) => ({ ...v, [p.variante_id]: "" }));
      onGuardado();
    } catch (e) {
      onError(e instanceof Error ? e.message : "No se pudo guardar el precio");
    } finally {
      setGuardando(null);
    }
  }

  return (
    <section id="precio-del-dia" className="mb-8 rounded-2xl bg-bg p-6 shadow-card ring-hair">
      <div className="mb-1 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warn-bg text-warn ring-1 ring-warn-border">
          <Tag className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </div>
        <h2 className="text-[17px] font-extrabold num-snug text-fg">El precio de hoy</h2>
      </div>
      <p className="mb-5 text-[13px] font-medium text-fg-muted">
        Estos productos cambian de precio de un día a otro. Escribe cuánto están{" "}
        <span className="font-semibold text-fg">hoy</span> y el bot podrá venderlos. Vale solo por
        hoy: mañana te lo vuelve a preguntar. Mientras no lo pongas, el bot no lo inventa.
      </p>

      <ul className="space-y-2.5">
        {precios.map((p) => (
          <li
            key={p.variante_id}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-bg-subtle p-3.5 ring-hair"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">
                {p.nombre}
                {p.presentacion && (
                  <span className="ml-1.5 rounded-md bg-bg px-1.5 py-0.5 text-[12px] font-bold text-fg-muted ring-1 ring-borde">
                    {p.presentacion}
                  </span>
                )}
              </p>
              <p className="truncate text-xs font-medium text-fg-muted">
                Cada tamaño tiene su precio
              </p>
            </div>

            {p.precio_hoy !== null ? (
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent ring-1 ring-inset ring-accent/15 tnum">
                Hoy: {formatUSD(p.precio_hoy)}
              </span>
            ) : (
              <span className="rounded-full bg-warn-bg px-2.5 py-1 text-[11px] font-semibold text-warn ring-1 ring-inset ring-warn-border">
                Sin precio de hoy
              </span>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-fg-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                aria-label={`Precio de hoy de ${p.nombre}`}
                value={valores[p.variante_id] ?? ""}
                onChange={(e) =>
                  setValores((v) => ({ ...v, [p.variante_id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") guardar(p);
                }}
                placeholder={p.precio_hoy !== null ? String(p.precio_hoy) : "0.00"}
                className={`${inputCls} w-28`}
              />
              <button
                onClick={() => guardar(p)}
                disabled={
                  guardando === p.variante_id || (valores[p.variante_id] ?? "").trim() === ""
                }
                className="focus-ring shrink-0 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
              >
                {guardando === p.variante_id
                  ? "Guardando…"
                  : p.precio_hoy !== null
                    ? "Corregir"
                    : "Guardar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function BandejaPage() {
  const [avisos, setAvisos] = useState<Intervencion[] | null>(null);
  const [precios, setPrecios] = useState<PrecioDiaProducto[]>([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<EstadoIntervencion>("pendiente");

  const cargar = useCallback(() => {
    setError("");
    getIntervenciones(filtro)
      .then(setAvisos)
      .catch((e) => setError(e.message));
    getPreciosDia()
      .then(setPrecios)
      .catch(() => {});
  }, [filtro]);

  useEffect(cargar, [cargar]);

  async function resolver(id: number, reactivar = false) {
    setError("");
    setEnviando(id);
    try {
      await resolverIntervencion(id, reactivar);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar el aviso");
    } finally {
      setEnviando(null);
    }
  }

  /** 🗂️ La propuesta del expediente: "Sí, es correcto" la vuelve dato; "No" la cierra sin
   * escribir nada. Ninguna de las dos toca la pausa del chat. Si el bot no puede aplicarla
   * (p. ej. el pedido ya está pagado), lo dice aquí arriba y la propuesta sigue pendiente. */
  async function decidirPropuesta(id: number, correcta: boolean) {
    setError("");
    setEnviando(id);
    try {
      if (correcta) await aplicarPropuesta(id);
      else await descartarPropuesta(id);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar tu respuesta");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="text-[28px] font-extrabold leading-tight num-tight text-fg">
          El bot te necesita
        </h1>
        <p className="mt-1 text-[15px] font-medium text-fg-muted">
          Cuando el bot no sabe algo, en vez de inventar se calla y te lo deja aquí. Responde tú por
          WhatsApp y reactívalo.
        </p>
      </header>

      {precios.length > 0 && (
        <PrecioDelDia precios={precios} onGuardado={cargar} onError={setError} />
      )}

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

      {avisos !== null && <ErrorBanner mensaje={error} />}

      {error && avisos === null ? (
        <ErrorState mensaje={error} onRetry={cargar} />
      ) : avisos === null ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-bg shadow-card ring-hair" />
          ))}
        </div>
      ) : avisos.length === 0 ? (
        <EmptyState
          icon={BellRing}
          titulo={filtro === "pendiente" ? "El bot no te necesita" : "Aún no has atendido ninguno"}
          texto={
            filtro === "pendiente"
              ? "Todo bajo control: no hay ningún chat esperándote."
              : "Los avisos que cierres quedarán guardados aquí."
          }
        />
      ) : (
        <div className="space-y-3">
          {avisos.map((a) => (
            <article key={a.id} className="rounded-2xl bg-bg p-6 shadow-card ring-hair">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent ring-1 ring-accent/15">
                    {(a.nombre || a.cliente || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-fg">{a.nombre || a.cliente}</p>
                    <p className="text-xs font-medium text-fg-muted tnum">
                      {a.nombre ? `${a.cliente} · ` : ""}
                      {formatFecha(a.fecha)}, {formatHora(a.fecha)}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${estiloMotivo(a.motivo)}`}
                >
                  {a.motivo === "propuesta_expediente"
                    ? a.estado === "pendiente"
                      ? "Por confirmar"
                      : a.propuesta?.resultado === "aplicada"
                        ? a.aplicada_por === "whuilianny (WhatsApp)"
                          ? "Confirmada por Whuilianny (WhatsApp)"
                          : "Confirmada"
                        : a.aplicada_por === "whuilianny (WhatsApp)"
                          ? "Descartada por Whuilianny (WhatsApp)"
                          : "Descartada"
                    : a.motivo_texto}
                </span>
              </div>

              {a.detalle && (
                <p className="mb-3 text-sm font-medium text-fg">{a.detalle}</p>
              )}

              {a.mensaje_cliente && (
                <div className="mb-4 flex gap-2.5 rounded-xl bg-bg-subtle p-3.5 ring-hair">
                  <Quote className="h-4 w-4 shrink-0 text-fg-faint" strokeWidth={1.8} />
                  <p className="text-[13px] font-medium italic text-fg-muted">
                    {a.mensaje_cliente}
                  </p>
                </div>
              )}

              {a.motivo === "propuesta_expediente" ? (
                a.estado === "pendiente" ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => decidirPropuesta(a.id, true)}
                        disabled={enviando === a.id}
                        className="focus-ring flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" strokeWidth={2} />
                        {enviando === a.id ? "Guardando…" : "Sí, es correcto"}
                      </button>
                      <button
                        onClick={() => decidirPropuesta(a.id, false)}
                        disabled={enviando === a.id}
                        className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle disabled:opacity-50"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                        No
                      </button>
                      {linkChat(a.cliente) && (
                        <Link
                          href={linkChat(a.cliente)!}
                          className="focus-ring flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-fg-muted transition hover:bg-bg-subtle"
                        >
                          <MessageCircle className="h-4 w-4" strokeWidth={2} />
                          Ver el chat
                        </Link>
                      )}
                    </div>
                    {a.propuesta?.preguntada_at && (
                      <p className="mt-2.5 text-[12px] font-medium text-fg-muted">
                        💰 Preguntado a Whuilianny por WhatsApp · {formatHora(a.propuesta.preguntada_at)}.
                        Su SÍ o NO desde su celular lo resuelve solo; aquí solo si quieres adelantarte.
                      </p>
                    )}
                    <p className="mt-2.5 text-[12px] font-medium text-fg-faint">
                      Alejandra leyó esto en un mensaje de Whuilianny. Si es correcto, queda anotado
                      en la venta con su firma; si no, no se guarda nada. El chat no cambia de manos.
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] font-medium text-fg-muted">
                    {a.propuesta?.resultado === "aplicada"
                      ? a.aplicada_por === "whuilianny (WhatsApp)"
                        ? "Confirmada por Whuilianny desde su WhatsApp: quedó anotada en la venta."
                        : "Confirmada: quedó anotada en la venta."
                      : a.aplicada_por === "whuilianny (WhatsApp)"
                        ? "Descartada por Whuilianny desde su WhatsApp: no se guardó nada."
                        : "Descartada: no se guardó nada."}
                  </p>
                )
              ) : a.estado === "pendiente" ? (
                <>
                  {a.motivo === "precio_del_dia" && precios.length > 0 && (
                    <p className="mb-3 text-[12px] font-medium text-fg-muted">
                      Puedes ponerle el precio de hoy{" "}
                      <a href="#precio-del-dia" className="font-semibold text-accent underline">
                        aquí arriba
                      </a>{" "}
                      y el bot lo venderá solo.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {linkChat(a.cliente) && (
                      <Link
                        href={linkChat(a.cliente)!}
                        className="focus-ring flex items-center gap-1.5 rounded-xl bg-bg px-3.5 py-2 text-[13px] font-semibold text-fg ring-1 ring-borde transition hover:bg-bg-subtle"
                      >
                        <MessageCircle className="h-4 w-4" strokeWidth={2} />
                        Responderle
                      </Link>
                    )}
                    <button
                      onClick={() => resolver(a.id)}
                      disabled={enviando === a.id}
                      className="focus-ring flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg transition hover:bg-accent-soft disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" strokeWidth={2} />
                      {enviando === a.id ? "Guardando…" : "Atendido, sigo yo"}
                    </button>
                    <button onClick={() => resolver(a.id, true)} disabled={enviando === a.id}
                      className="focus-ring rounded-xl px-3.5 py-2 text-[13px] font-semibold ring-1 ring-borde">
                      Atendido, devolver al bot
                    </button>
                  </div>
                  <p className="mt-2.5 text-[12px] font-medium text-fg-faint">
                    Alejandra espera. Puedes cerrar el aviso y seguir atendiendo tú, o devolverle el chat.
                  </p>
                </>
              ) : (
                <p className="text-[12px] font-medium text-fg-muted">
                  Aviso atendido. Puedes revisar quién atiende el chat en Conversaciones.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
