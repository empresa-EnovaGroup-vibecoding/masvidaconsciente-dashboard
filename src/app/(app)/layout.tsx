"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, BellRing, BarChart3, ShoppingBag, Wallet, Coins, CalendarDays, BookOpen, Users, MessageCircle, Bot, Lightbulb, MessageSquare, Settings, LogOut, Menu, X, Truck } from "lucide-react";
import { clearToken, isLoggedIn, getPagos, getIntervenciones, getConfiguracion, type ConfiguracionNegocio } from "@/lib/api";

type Destino = { href: string; label: string; icon: typeof LayoutGrid };

// El menú sigue el trabajo de la dueña, no el orden en que se programaron las pantallas.
// Ver primero lo urgente, luego vender, organizar el negocio y, por último, ajustar a Alejandra.
const INICIO: Destino = { href: "/dashboard", label: "Resumen de hoy", icon: LayoutGrid };
const SECCIONES_NAVEGACION: { titulo: string; destinos: Destino[] }[] = [
  {
    titulo: "Atender clientes",
    destinos: [
      { href: "/bandeja", label: "El bot te necesita", icon: BellRing },
      { href: "/conversaciones", label: "Conversaciones", icon: MessageCircle },
    ],
  },
  {
    titulo: "Ventas",
    destinos: [
      { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
      { href: "/pagos", label: "Pagos", icon: Wallet },
      { href: "/tasa", label: "Tasa del dólar", icon: Coins },
      { href: "/reporte", label: "Reporte", icon: BarChart3 },
    ],
  },
  {
    titulo: "Organizar mi negocio",
    destinos: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/catalogo", label: "Catálogo", icon: BookOpen },
      { href: "/horario", label: "Horario", icon: CalendarDays },
      // Aquí se configuran zonas y tarifas, no las entregas del día (esas viven en Pedidos).
      { href: "/entregas", label: "Zonas de envío", icon: Truck },
    ],
  },
  {
    titulo: "Alejandra",
    destinos: [
      { href: "/bot", label: "Probar a Alejandra", icon: Bot },
      { href: "/conocimiento", label: "Lo que sabe", icon: Lightbulb },
      { href: "/mensajes", label: "Mensajes automáticos", icon: MessageSquare },
    ],
  },
  {
    titulo: "Ajustes",
    destinos: [{ href: "/configuracion", label: "Configuración", icon: Settings }],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [listo, setListo] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [avisos, setAvisos] = useState(0);
  const [config, setConfig] = useState<ConfiguracionNegocio | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
    else setListo(true);
  }, [router]);

  useEffect(() => {
    if (!listo) return;
    // Los contadores se refrescan solos: un aviso del bot ("te necesita") no
    // sirve de nada si la dueña tiene que recargar la página para verlo.
    function contar() {
      getPagos("reportado")
        .then((p) => setPendientes(p.length))
        .catch(() => {});
      getIntervenciones("pendiente")
        .then((a) => setAvisos(a.length))
        .catch(() => {});
    }
    contar();
    getConfiguracion()
      .then(setConfig)
      .catch(() => {});
    const id = setInterval(contar, 45_000);
    return () => clearInterval(id);
  }, [listo, pathname]);

  // En celular, cerrar el menú al cambiar de página.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  if (!listo) return null;

  function salir() {
    clearToken();
    router.replace("/login");
  }

  const negocio = config?.negocio_nombre?.trim() || "Mi negocio";
  const ubicacion = config?.negocio_ubicacion?.trim() || "Panel";
  const inicial = negocio.charAt(0).toUpperCase();

  function enlace({ href, label, icon: Icon }: Destino) {
    const activo = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMenuAbierto(false)}
        aria-current={activo ? "page" : undefined}
        className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
          activo
            ? "bg-accent/10 text-accent font-semibold"
            : "text-fg-muted font-medium hover:bg-bg-subtle hover:text-fg"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={activo ? 2 : 1.8} />
        <span className="flex-1">{label}</span>
        {href === "/pagos" && pendientes > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warn-bg px-1.5 text-[11px] font-semibold text-warn ring-1 ring-warn-border tnum">
            {pendientes}
          </span>
        )}
        {href === "/bandeja" && avisos > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-50 px-1.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-600/15 tnum">
            {avisos}
          </span>
        )}
        {activo && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
      </Link>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fondo oscuro detrás del menú en celular */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Menú lateral: cajón deslizante en celular, fijo en computadora */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-borde/70 bg-bg transition-transform duration-200 md:static md:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Más Vida Consciente" className="h-11 w-11 shrink-0 object-contain" />
          <div className="leading-tight">
            <p className="font-extrabold text-[15px] num-snug text-fg">masvidaconsciente</p>
            <p className="text-xs font-medium text-fg-muted">Panel de la dueña</p>
          </div>
          <button
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            className="focus-ring ml-auto rounded-lg p-1.5 text-fg-muted hover:text-fg md:hidden"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-2">
          {enlace(INICIO)}
          {SECCIONES_NAVEGACION.map(({ titulo, destinos }) => (
            <section key={titulo} className="mt-4" aria-labelledby={`nav-${titulo.replaceAll(" ", "-")}`}>
              <h2 id={`nav-${titulo.replaceAll(" ", "-")}`} className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted">
                {titulo}
              </h2>
              <div className="space-y-0.5">{destinos.map(enlace)}</div>
            </section>
          ))}
        </nav>

        <div className="border-t border-borde/70 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent ring-1 ring-accent/15">
              {inicial}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-fg">{negocio}</p>
              <p className="truncate text-xs font-medium text-fg-muted">{ubicacion}</p>
            </div>
          </div>
          <button
            onClick={salir}
            className="focus-ring mt-1 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
            Salir
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Barra superior con hamburguesa (solo celular) */}
        <header className="flex items-center gap-3 border-b border-borde/70 bg-bg px-4 py-3 md:hidden">
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="focus-ring rounded-lg p-1.5 text-fg"
          >
            <Menu className="h-6 w-6" strokeWidth={1.8} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          <p className="font-extrabold num-snug text-fg">masvidaconsciente</p>
          <div className="ml-auto flex items-center gap-1.5">
            {avisos > 0 && (
              <Link
                href="/bandeja"
                aria-label={`${avisos} chats esperándote`}
                className="focus-ring flex h-5 min-w-5 items-center justify-center rounded-full bg-red-50 px-1.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-600/15 tnum"
              >
                {avisos}
              </Link>
            )}
            {pendientes > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warn-bg px-1.5 text-[11px] font-semibold text-warn ring-1 ring-warn-border tnum">
                {pendientes}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
