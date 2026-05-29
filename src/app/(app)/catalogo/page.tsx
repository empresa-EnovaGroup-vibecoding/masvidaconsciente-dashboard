"use client";

import { useEffect, useState } from "react";
import { getProductos, type Producto } from "@/lib/api";

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getProductos().then(setProductos).catch((e) => setError(e.message));
  }, []);

  const categorias = Array.from(new Set(productos.map((p) => p.categoria || "otros")));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-marca-900 mb-1">Catálogo</h1>
      <p className="text-marca-600 mb-6">Los productos que el bot ofrece a tus clientes</p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {categorias.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-marca-500 mb-3">{cat}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {productos
              .filter((p) => (p.categoria || "otros") === cat)
              .map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-marca-100 p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-marca-900">{p.nombre}</p>
                    <span className="font-semibold text-marca-600">
                      {p.precio !== null ? `$${p.precio}` : "consultar"}
                    </span>
                  </div>
                  {p.presentacion && <p className="text-xs text-marca-500 mt-0.5">{p.presentacion}</p>}
                  {p.descripcion && <p className="text-sm text-marca-600 mt-2">{p.descripcion}</p>}
                  {!p.disponible && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      No disponible
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
