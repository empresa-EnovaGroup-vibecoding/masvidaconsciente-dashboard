"use client";

import { useEffect, useState } from "react";
import { getProductos, type Producto } from "@/lib/api";

const ORDEN = ["panaderia", "dulceria", "congelados", "artesanal", "harinas"];
const TITULO: Record<string, string> = {
  panaderia: "Panadería",
  dulceria: "Dulcería",
  congelados: "Congelados",
  artesanal: "Artesanal",
  harinas: "Harinas",
};

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getProductos().then(setProductos).catch((e) => setError(e.message));
  }, []);

  const rank = (c: string) => {
    const i = ORDEN.indexOf(c);
    return i === -1 ? 99 : i;
  };
  const categorias = productos
    ? Array.from(new Set(productos.map((p) => p.categoria || "otros"))).sort(
        (a, b) => rank(a) - rank(b),
      )
    : [];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Catálogo</h1>
        <p className="text-sm text-fg-muted mt-1">Los productos que el bot ofrece a tus clientes</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {productos === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-bg border border-borde animate-pulse" />
          ))}
        </div>
      ) : (
        categorias.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted/70 mb-3">
              {TITULO[cat] || cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {productos
                .filter((p) => (p.categoria || "otros") === cat)
                .map((p) => (
                  <div
                    key={p.id}
                    className="bg-bg rounded-2xl border border-borde p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-fg">{p.nombre}</p>
                      <span className="text-sm font-semibold text-accent tnum shrink-0">
                        {p.precio !== null ? `$${p.precio}` : "consultar"}
                      </span>
                    </div>
                    {p.presentacion && (
                      <p className="text-[12px] text-fg-muted/80 mt-0.5">{p.presentacion}</p>
                    )}
                    {p.descripcion && (
                      <p className="text-[13px] text-fg-muted mt-2 leading-relaxed line-clamp-2">
                        {p.descripcion}
                      </p>
                    )}
                    {!p.disponible && (
                      <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                        No disponible
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
