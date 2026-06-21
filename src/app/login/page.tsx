"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="min-h-screen flex items-center justify-center bg-bg-subtle px-4">
      <div className="w-full max-w-[360px]">
        <div className="flex flex-col items-center mb-10">
          <div className="h-11 w-11 rounded-2xl bg-accent flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-accent-fg">
              <path
                d="M11 20A7 7 0 0 1 4 13c0-4 3-7 8-9 1 5-1 9-4 11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">masvidaconsciente</h1>
          <p className="text-sm text-fg-muted mt-1">Panel de gestión</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-fg-muted mb-1.5">Correo</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="focus-ring w-full rounded-xl ring-1 ring-borde bg-bg px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-faint transition"
              placeholder="tucorreo@masvidaconsciente.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-fg-muted mb-1.5">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="focus-ring w-full rounded-xl ring-1 ring-borde bg-bg px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-faint transition"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-accent text-accent-fg py-2.5 text-sm font-medium hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50"
          >
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-xs text-fg-muted/70 mt-8">
          masvidaconsciente · Cabudare
        </p>
      </div>
    </div>
  );
}
