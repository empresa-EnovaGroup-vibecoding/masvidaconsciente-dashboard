const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Sesión expirada");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error" }));
    throw new Error(err.detail || "Error en la solicitud");
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error" }));
    throw new Error(err.detail || "Credenciales incorrectas");
  }
  const data = await res.json();
  setToken(data.access_token);
}

// ─── Tipos ───────────────────────────────────────────────────────────

export interface Metricas {
  pedidos_hoy: number;
  ventas_hoy_usd: number;
  clientes_total: number;
  pedidos_pendientes: number;
}

export interface ItemPedido {
  producto: string;
  cantidad: number;
  precio_unitario: number | null;
  presentacion?: string | null;
}

export interface Pedido {
  id: number;
  cliente: string;
  estado: string;
  items: ItemPedido[];
  total_usd: number;
  notas: string | null;
  fecha: string;
}

export interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  precio: number | null;
  presentacion: string | null;
  disponible: boolean;
}

export interface Conversacion {
  telefono: string;
  nombre: string | null;
  ultimo_mensaje: string | null;
  ultima_interaccion: string;
  bot_pausado: boolean;
}

export interface Mensaje {
  rol: string;
  contenido: string;
  fecha: string;
}

export type EstadoPago = "reportado" | "confirmado" | "rechazado" | "parcial";

export interface Pago {
  id: number;
  pedido_id: number;
  cliente: string | null;
  items: ItemPedido[] | null;
  estado: EstadoPago;
  metodo: string;
  monto_usd: number | null;
  monto_bs: number | null;
  monto_recibido: number | null;
  tasa_usada: number | null;
  referencia: string | null;
  tiene_comprobante: boolean;
  confirmado_por: string | null;
  fecha: string;
}

export interface ConfiguracionNegocio {
  negocio_nombre: string | null;
  negocio_ubicacion: string | null;
  negocio_pago: string | null;
  negocio_instagram: string | null;
  pago_movil_banco: string | null;
  pago_movil_cedula: string | null;
  pago_movil_telefono: string | null;
  pago_movil_titular: string | null;
  dueno_telefono: string | null;
}

export interface ReportePeriodo {
  ventas_usd: number;
  num_ventas: number;
  pedidos: number;
}

export interface Reporte {
  hoy: ReportePeriodo;
  semana: ReportePeriodo;
  mes: ReportePeriodo;
}

export interface EstadoTasa {
  bcv_base: number | null;
  margen_pct: number;
  manual_valor: number | null;
  manual_activa: boolean;
  tasa_efectiva: number | null;
}

export interface Personalidad {
  personalidad: string;
  default: string;
}

export interface ClienteResumen {
  telefono: string;
  nombre: string | null;
  num_pedidos: number;
  total_gastado_usd: number;
  ultima_compra: string | null;
  ultima_interaccion: string;
}

export interface PedidoCliente {
  id: number;
  estado: string;
  items: ItemPedido[];
  total_usd: number;
  fecha: string;
}

export interface ClienteDetalle {
  telefono: string;
  nombre: string | null;
  notas: string | null;
  primera_interaccion: string;
  ultima_interaccion: string;
  total_gastado_usd: number;
  num_pedidos: number;
  pedidos: PedidoCliente[];
}

export interface Conocimiento {
  id: number;
  categoria: string | null;
  titulo: string;
  contenido: string;
}

export type ConocimientoInput = Omit<Conocimiento, "id">;

export type ProductoInput = Omit<Producto, "id">;

// ─── Endpoints ───────────────────────────────────────────────────────

export const getMetricas = () => request<Metricas>("/api/metricas");
export const getReporte = () => request<Reporte>("/api/reporte");
export const getConfiguracion = () => request<ConfiguracionNegocio>("/api/configuracion");
export const guardarConfiguracion = (valores: Partial<ConfiguracionNegocio>) =>
  request("/api/configuracion", { method: "PUT", body: JSON.stringify({ valores }) });
export const getTasa = () => request<EstadoTasa>("/api/tasa");
export const guardarTasa = (datos: {
  margen_pct?: number;
  manual_valor?: number;
  manual_activa?: boolean;
}) => request("/api/tasa", { method: "PUT", body: JSON.stringify(datos) });
export const getPersonalidad = () => request<Personalidad>("/api/personalidad");
export const guardarPersonalidad = (personalidad: string) =>
  request("/api/personalidad", { method: "PUT", body: JSON.stringify({ personalidad }) });
export const probarBot = (
  mensaje: string,
  historial: { role: string; content: string }[],
) =>
  request<{ respuesta: string }>("/api/probar", {
    method: "POST",
    body: JSON.stringify({ mensaje, historial }),
  });
export const getClientes = () => request<ClienteResumen[]>("/api/clientes");
export const getCliente = (telefono: string) =>
  request<ClienteDetalle>(`/api/clientes/${encodeURIComponent(telefono)}`);
export const guardarNotasCliente = (telefono: string, notas: string) =>
  request(`/api/clientes/${encodeURIComponent(telefono)}/notas`, {
    method: "PUT",
    body: JSON.stringify({ notas }),
  });
export const pausarBotCliente = (telefono: string, pausado: boolean) =>
  request(`/api/clientes/${encodeURIComponent(telefono)}/pausa`, {
    method: "PUT",
    body: JSON.stringify({ pausado }),
  });
export const getBotEstado = () => request<{ activo: boolean }>("/api/bot-estado");
export const guardarBotEstado = (activo: boolean) =>
  request<{ ok: boolean; activo: boolean }>("/api/bot-estado", {
    method: "PUT",
    body: JSON.stringify({ activo }),
  });
export const getConocimiento = () => request<Conocimiento[]>("/api/conocimiento");
export const crearConocimiento = (data: ConocimientoInput) =>
  request<{ id: number }>("/api/conocimiento", { method: "POST", body: JSON.stringify(data) });
export const editarConocimiento = (id: number, data: ConocimientoInput) =>
  request(`/api/conocimiento/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const borrarConocimiento = (id: number) =>
  request(`/api/conocimiento/${id}`, { method: "DELETE" });
export const getPedidos = () => request<Pedido[]>("/api/pedidos");
export const cambiarEstadoPedido = (id: number, estado: string) =>
  request(`/api/pedidos/${id}`, { method: "PATCH", body: JSON.stringify({ estado }) });
export const getProductos = () => request<Producto[]>("/api/productos");
export const crearProducto = (data: ProductoInput) =>
  request<{ id: number }>("/api/productos", { method: "POST", body: JSON.stringify(data) });
export const editarProducto = (id: number, data: ProductoInput) =>
  request(`/api/productos/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const getConversaciones = () => request<Conversacion[]>("/api/conversaciones");
export const getMensajes = (telefono: string) =>
  request<Mensaje[]>(`/api/conversaciones/${telefono}`);

export const getPagos = (estado?: string) =>
  request<Pago[]>(`/api/pagos${estado ? `?estado=${estado}` : ""}`);
export const confirmarPago = (id: number) =>
  request(`/api/pagos/${id}/confirmar`, { method: "POST" });
export const rechazarPago = (id: number, motivo?: string) =>
  request(`/api/pagos/${id}/rechazar`, {
    method: "POST",
    body: JSON.stringify({ motivo: motivo ?? null }),
  });
export const verificarMonto = (id: number, monto_recibido: number) =>
  request(`/api/pagos/${id}/verificar-monto`, {
    method: "POST",
    body: JSON.stringify({ monto_recibido }),
  });

/**
 * Descarga el comprobante (imagen/PDF) como blob usando el token Bearer y
 * devuelve un objectURL. Un <img src> directo NO sirve porque no manda el
 * header Authorization, y el comprobante es privado (trae datos bancarios).
 */
export async function getComprobanteUrl(pagoId: number): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/pagos/${pagoId}/comprobante`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo cargar el comprobante");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
