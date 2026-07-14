"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, BellRing, BarChart3, ShoppingBag, Wallet, Coins, CalendarDays, BookOpen, Users, MessageCircle, Bot, Lightbulb, MessageSquare, Settings, LogOut, Menu, X, Truck } from "lucide-react";
import { clearToken, isLoggedIn, getPagos, getIntervenciones, getConfiguracion, type ConfiguracionNegocio } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Resumen", icon: LayoutGrid },
  { href: "/bandeja", label: "El bot te necesita", icon: BellRing },
  { href: "/reporte", label: "Reporte", icon: BarChart3 },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/pagos", label: "Pagos", icon: Wallet },
  { href: "/tasa", label: "Tasa", icon: Coins },
  { href: "/horario", label: "Horario", icon: CalendarDays },
  { href: "/catalogo", label: "Catálogo", icon: BookOpen },
  // El envío es DINERO: vive aquí (casillas con número que el código OBEDECE), no en
  // Conocimiento (un texto que el bot lee y cuenta como quiere). Ver 2026-07-14.
  { href: "/entregas", label: "Entregas", icon: Truck },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/conversaciones", label: "Conversaciones", icon: MessageCircle },
  { href: "/bot", label: "Mi Bot", icon: Bot },
  { href: "/conocimiento", label: "Conocimiento", icon: Lightbulb },
  { href: "/mensajes", label: "Mensajes", icon: MessageSquare },
  { href: "/configuracion", label: "Configuración", icon: Settings },
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

        <nav aria-label="Navegación principal" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
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
                {label === "Pagos" && pendientes > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warn-bg px-1.5 text-[11px] font-semibold text-warn ring-1 ring-warn-border tnum">
                    {pendientes}
                  </span>
                )}
                {label === "El bot te necesita" && avisos > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-50 px-1.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-600/15 tnum">
                    {avisos}
                  </span>
                )}
                {activo && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
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
