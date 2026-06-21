"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, BarChart3, ShoppingBag, Wallet, Coins, BookOpen, Users, MessageCircle, Bot, Lightbulb, MessageSquare, Settings, LogOut } from "lucide-react";
import { clearToken, isLoggedIn, getPagos, getConfiguracion, type ConfiguracionNegocio } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Resumen", icon: LayoutGrid },
  { href: "/reporte", label: "Reporte", icon: BarChart3 },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/pagos", label: "Pagos", icon: Wallet },
  { href: "/tasa", label: "Tasa", icon: Coins },
  { href: "/catalogo", label: "Catálogo", icon: BookOpen },
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
  const [config, setConfig] = useState<ConfiguracionNegocio | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
    else setListo(true);
  }, [router]);

  useEffect(() => {
    if (!listo) return;
    getPagos("reportado")
      .then((p) => setPendientes(p.length))
      .catch(() => setPendientes(0));
    getConfiguracion()
      .then(setConfig)
      .catch(() => {});
  }, [listo, pathname]);

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
      <aside className="w-64 shrink-0 border-r border-borde/70 bg-bg/95 backdrop-blur flex flex-col">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent shadow-soft">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-accent-fg" fill="currentColor" aria-hidden="true">
              <path d="M5 19c0-7 5-12 14-13 0 9-5 14-12 14-1.6 0-2 0-2 0Z" />
              <path d="M6 18.5C9.5 14 13 11.5 17 9.5" fill="none" stroke="hsl(152 45% 33%)" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="font-extrabold text-[15px] num-snug text-fg">masvidaconsciente</p>
            <p className="text-xs font-medium text-fg-muted">Panel de la dueña</p>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const activo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
