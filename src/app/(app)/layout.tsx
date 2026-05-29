"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Leaf, LayoutDashboard, ShoppingBag, BookOpen, MessageCircle, LogOut } from "lucide-react";
import { clearToken, isLoggedIn } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/catalogo", label: "Catálogo", icon: BookOpen },
  { href: "/conversaciones", label: "Conversaciones", icon: MessageCircle },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
    } else {
      setListo(true);
    }
  }, [router]);

  if (!listo) return null;

  function salir() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-white border-r border-marca-100 flex flex-col">
        <div className="p-5 flex items-center gap-2 border-b border-marca-100">
          <div className="h-9 w-9 rounded-lg bg-marca-600 flex items-center justify-center">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-marca-900">masvidaconsciente</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const activo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  activo ? "bg-marca-600 text-white" : "text-marca-700 hover:bg-marca-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={salir}
          className="m-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-marca-700 hover:bg-marca-50 transition"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
