"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ingresar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-marca-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-marca-600 flex items-center justify-center mb-4">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-marca-900">masvidaconsciente</h1>
          <p className="text-sm text-marca-600 mt-1">Panel de gestión</p>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm border border-marca-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-marca-900 mb-1">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-marca-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marca-500"
              placeholder="tucorreo@masvidaconsciente.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-marca-900 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-marca-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marca-500"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-marca-600 text-white py-2.5 font-medium hover:bg-marca-700 transition disabled:opacity-50"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
