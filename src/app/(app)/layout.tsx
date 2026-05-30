"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, ShoppingBag, BookOpen, MessageCircle, LogOut } from "lucide-react";
import { clearToken, isLoggedIn } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Resumen", icon: LayoutGrid },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/catalogo", label: "Catálogo", icon: BookOpen },
  { href: "/conversaciones", label: "Conversaciones", icon: MessageCircle },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login");
    else setListo(true);
  }, [router]);

  if (!listo) return null;

  function salir() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex bg-bg-subtle">
      <aside className="w-64 shrink-0 bg-bg border-r border-borde flex flex-col">
        <div className="px-5 h-16 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
              <path
                d="M11 20A7 7 0 0 1 4 13c0-4 3-7 8-9 1 5-1 9-4 11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-fg text-[15px]">masvidaconsciente</span>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const activo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                  activo
                    ? "bg-bg-subtle text-fg font-medium"
                    : "text-fg-muted hover:text-fg hover:bg-bg-subtle/60"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${activo ? "text-accent" : ""}`} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={salir}
          className="m-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-bg-subtle/60 transition-colors duration-200"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          Salir
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
