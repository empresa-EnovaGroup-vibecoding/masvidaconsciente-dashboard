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
  cantidad: number; // PAQUETES completos, nunca unidades sueltas
  precio_unitario: number | null;
  presentacion?: string | null;
  // Lo que el cliente eligió dentro del paquete (relleno, masa, sabor). No cambia el precio,
  // pero la dueña lo necesita para cocinar.
  opciones?: string | null;
}

export interface Pedido {
  id: number;
  cliente: string;
  nombre?: string | null;
  estado: string;
  items: ItemPedido[];
  total_usd: number;
  notas: string | null;
  // Para cuándo y cómo lo quiere ("sábado en la tarde, delivery en Cabudare").
  entrega?: string | null;
  fecha: string;
  // Pago que impide editar/eliminar: 'confirmado' | 'parcial' | 'reportado' | null.
  pago_bloqueante?: string | null;
}

export interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  precio: number | null;
  presentacion: string | null;
  duracion: string | null;
  se_congela: string | null;
  apto_diabeticos: string | null;
  info: string | null;
  // Días de anticipación que necesita ESTE producto (0 = puede salir el mismo día si hay stock;
  // las tortas y lo horneado, 2). El bot NO puede prometerlo para antes.
  dias_anticipacion: number;
  disponible: boolean;
  imagen?: string | null; // URL de la primera foto (miniatura en la tarjeta); solo lectura
}

export interface ProductoMedia {
  id: number;
  tipo: string; // 'imagen' | 'video'
  url: string;
}

export interface Conversacion {
  telefono: string;
  nombre: string | null;
  ultimo_mensaje: string | null;
  ultima_interaccion: string;
  bot_pausado: boolean;
  /** "dueña" = lo tomaste TÚ · "bot" = el bot se pausó solo al escalarte algo */
  pausado_por?: string | null;
  no_leidos?: number;
}

export interface Mensaje {
  id?: number;
  /** "user" = el cliente · "assistant" = el bot · "owner" = TÚ (una persona) */
  rol: string;
  contenido: string;
  fecha: string;
  tipo?: string;
  media_id?: string | null;
  /** true = ese mensaje trae un archivo que se puede ver (el comprobante del cliente) */
  tiene_media?: boolean;
  /** enviado | entregado | leido | fallido. null = no lo enviamos nosotros. */
  estado?: string | null;
  error?: string | null;
}

/** Si se le puede escribir a este cliente AHORA MISMO (la regla de las 24h de WhatsApp). */
export interface VentanaChat {
  abierta: boolean;
  minutos_restantes: number;
  cierra: string | null;
}

export interface EstadoConversacion {
  telefono: string;
  nombre: string | null;
  /** true = el bot no responde en ese chat */
  bot_pausado: boolean;
  /** "dueña" = lo tomaste TÚ · "bot" = el bot se pausó solo al escalarte algo */
  pausado_por?: string | null;
  no_leidos: number;
  ventana: VentanaChat;
  es_simulador: boolean;
}

/** Cuántos chats tienes tomados tú (el bot está callado ahí) y cuántos sin leer. */
export interface ResumenChats {
  chats_tomados: number;
  chats_sin_leer: number;
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
  // Días en que SÍ se entrega, separados por coma ("lunes,martes,..."). Es un candado: el bot
  // no puede prometer una fecha que caiga en un día que no está aquí.
  dias_entrega: string | null;
  // Horario de atención (el bot responde igual fuera de hora, pero no promete entregas).
  hora_apertura: string | null;
  hora_cierre: string | null;
  // Hasta qué hora se aceptan pedidos para el MISMO día. Es un candado del código.
  hora_corte: string | null;
  // Modelo de IA con el que el bot conversa. Lo elige la proveedora.
  modelo_ia: string | null;
}

/** Un día suelto en que el negocio NO entrega (viaje, feriado, vacaciones). */
export interface Feriado {
  fecha: string; // AAAA-MM-DD
  motivo: string | null;
}

export interface MetodoPago {
  id: number;
  tipo: string;
  titulo: string;
  titular?: string | null;
  banco?: string | null;
  telefono?: string | null;
  cedula?: string | null;
  cuenta?: string | null;
  correo?: string | null;
  wallet?: string | null;
  instrucciones?: string | null;
  activo: boolean;
  orden: number;
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
  puede_borrar?: boolean;
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

/** Un aviso de "el bot te necesita": el bot se calló en ese chat y te espera. */
export interface Intervencion {
  id: number;
  cliente: string; // teléfono
  nombre: string | null;
  motivo: string; // precio_del_dia | no_se | pide_persona | reclamo
  motivo_texto: string; // ya viene legible desde el bot
  detalle: string | null;
  mensaje_cliente: string | null;
  estado: string; // pendiente | resuelta
  fecha: string;
}

export type EstadoIntervencion = "pendiente" | "resuelta";

/** Producto de PRECIO VARIABLE (su precio cambia de un día a otro) y lo que vale HOY. */
export interface PrecioDiaProducto {
  producto_id: number;
  nombre: string;
  presentacion: string | null;
  precio_hoy: number | null;
}

export type ProductoInput = Omit<Producto, "id">;

export interface GuiasMensajes {
  msg_guia_confirmado: string;
  msg_guia_rechazado: string;
  msg_guia_comprobante: string;
}

// ─── Endpoints ───────────────────────────────────────────────────────

export const getMetricas = () => request<Metricas>("/api/metricas");
export const getReporte = () => request<Reporte>("/api/reporte");
export const getConfiguracion = () => request<ConfiguracionNegocio>("/api/configuracion");
export const guardarConfiguracion = (valores: Partial<ConfiguracionNegocio>) =>
  request("/api/configuracion", { method: "PUT", body: JSON.stringify({ valores }) });
export const getMetodosPago = () => request<MetodoPago[]>("/api/metodos-pago");
export const crearMetodoPago = (b: Partial<MetodoPago>) =>
  request("/api/metodos-pago", { method: "POST", body: JSON.stringify(b) });
export const actualizarMetodoPago = (id: number, b: Partial<MetodoPago>) =>
  request(`/api/metodos-pago/${id}`, { method: "PUT", body: JSON.stringify(b) });
export const borrarMetodoPago = (id: number) =>
  request(`/api/metodos-pago/${id}`, { method: "DELETE" });
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
export const editarCliente = (
  telefono: string,
  datos: { nombre?: string | null; notas?: string | null },
) =>
  request(`/api/clientes/${encodeURIComponent(telefono)}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
export const borrarCliente = (telefono: string) =>
  request(`/api/clientes/${encodeURIComponent(telefono)}`, { method: "DELETE" });
export const getBotEstado = () => request<{ activo: boolean }>("/api/bot-estado");
export const guardarBotEstado = (activo: boolean) =>
  request<{ ok: boolean; activo: boolean }>("/api/bot-estado", {
    method: "PUT",
    body: JSON.stringify({ activo }),
  });
export const getGuiasMensajes = () => request<GuiasMensajes>("/api/mensajes");
export const guardarGuiasMensajes = (valores: Partial<GuiasMensajes>) =>
  request("/api/mensajes", { method: "PUT", body: JSON.stringify({ valores }) });
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
export const borrarPedido = (id: number) => request(`/api/pedidos/${id}`, { method: "DELETE" });
export const editarItemsPedido = (
  id: number,
  // `opciones` viaja SIEMPRE: si el panel no lo reenvía, el relleno que eligió el cliente se
  // PIERDE al editar el pedido y la dueña ya no sabe qué cocinar.
  items: { producto: string; cantidad: number; opciones?: string | null }[],
) => request(`/api/pedidos/${id}/items`, { method: "PUT", body: JSON.stringify({ items }) });
export const getProductos = () => request<Producto[]>("/api/productos");
export const crearProducto = (data: ProductoInput) =>
  request<{ id: number }>("/api/productos", { method: "POST", body: JSON.stringify(data) });
export const editarProducto = (id: number, data: ProductoInput) =>
  request(`/api/productos/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const borrarProducto = (id: number) =>
  request(`/api/productos/${id}`, { method: "DELETE" });
export const getMediaProducto = (productoId: number) =>
  request<ProductoMedia[]>(`/api/productos/${productoId}/media`);
export async function subirMediaProducto(productoId: number, file: File): Promise<ProductoMedia> {
  const token = getToken();
  const fd = new FormData();
  fd.append("archivo", file);
  const res = await fetch(`${API_URL}/api/productos/${productoId}/media`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error" }));
    throw new Error(err.detail || "No se pudo subir el archivo");
  }
  return res.json();
}
export const borrarMedia = (mediaId: number) =>
  request(`/api/media/${mediaId}`, { method: "DELETE" });
export const getFeriados = () => request<Feriado[]>("/api/feriados");
export const crearFeriado = (fecha: string, motivo?: string | null) =>
  request("/api/feriados", { method: "POST", body: JSON.stringify({ fecha, motivo: motivo ?? null }) });
export const borrarFeriado = (fecha: string) =>
  request(`/api/feriados/${fecha}`, { method: "DELETE" });
export const getCatalogoPdf = () => request<{ tiene: boolean }>("/api/catalogo-pdf");
export async function subirCatalogoPdf(file: File): Promise<void> {
  const token = getToken();
  const fd = new FormData();
  fd.append("archivo", file);
  const res = await fetch(`${API_URL}/api/catalogo-pdf`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error" }));
    throw new Error(err.detail || "No se pudo subir el catálogo");
  }
}
export const borrarCatalogoPdf = () => request("/api/catalogo-pdf", { method: "DELETE" });
export const getConversaciones = () => request<Conversacion[]>("/api/conversaciones");
export const getMensajes = (telefono: string) =>
  request<Mensaje[]>(`/api/conversaciones/${telefono}`);
export const borrarConversacion = (telefono: string) =>
  request(`/api/conversaciones/${encodeURIComponent(telefono)}`, { method: "DELETE" });
export const getResumenChats = () => request<ResumenChats>("/api/conversaciones-resumen");
export const marcarLeido = (telefono: string) =>
  request(`/api/conversaciones/${encodeURIComponent(telefono)}/leido`, { method: "POST" });

/**
 * El archivo de UN mensaje del hilo (el comprobante que mandó el cliente). Igual que el de
 * pagos: se descarga con el token y se convierte en objectURL. Un <img src> directo NO sirve
 * (no manda el header Authorization) y el comprobante es privado: trae datos bancarios.
 */
export async function getMediaMensajeUrl(
  mensajeId: number,
): Promise<{ url: string; esPdf: boolean }> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/mensajes/${mensajeId}/media`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo cargar el archivo");
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), esPdf: !blob.type.startsWith("image/") };
}

export const getEstadoConversacion = (telefono: string) =>
  request<EstadoConversacion>(`/api/conversaciones/${encodeURIComponent(telefono)}/estado`);
/** TÚ le respondes al cliente por WhatsApp. El bot se calla solo en ese chat. */
export const responderCliente = (telefono: string, texto: string) =>
  request<{ ok: boolean; wa_message_id: string | null; bot_pausado: boolean }>(
    `/api/conversaciones/${encodeURIComponent(telefono)}/mensajes`,
    { method: "POST", body: JSON.stringify({ texto }) },
  );

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
export const reabrirPago = (id: number) => request(`/api/pagos/${id}/reabrir`, { method: "POST" });
export const anularPago = (id: number) => request(`/api/pagos/${id}/anular`, { method: "POST" });

// ─── "El bot te necesita": bandeja de avisos + precio del día ────────
export const getIntervenciones = (estado: EstadoIntervencion = "pendiente") =>
  request<Intervencion[]>(`/api/intervenciones?estado=${estado}`);
/** La dueña ya atendió el chat: cierra el aviso y (por defecto) reactiva el bot. */
export const resolverIntervencion = (id: number, reactivar = true) =>
  request<{ ok: boolean; bot_reactivado: boolean }>(
    `/api/intervenciones/${id}/resolver?reactivar=${reactivar}`,
    { method: "POST" },
  );
export const getPreciosDia = () => request<PrecioDiaProducto[]>("/api/precio-dia");
/** El precio vale SOLO por hoy: mañana el bot lo vuelve a preguntar. */
export const guardarPrecioDia = (producto_id: number, precio: number, nota?: string | null) =>
  request<{ ok: boolean; producto: string; precio_hoy: number }>("/api/precio-dia", {
    method: "PUT",
    body: JSON.stringify({ producto_id, precio, nota: nota ?? null }),
  });

/**
 * Descarga el comprobante (imagen/PDF) como blob usando el token Bearer y
 * devuelve un objectURL. Un <img src> directo NO sirve porque no manda el
 * header Authorization, y el comprobante es privado (trae datos bancarios).
 */
export async function getComprobanteUrl(
  pagoId: number,
): Promise<{ url: string; esPdf: boolean }> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/pagos/${pagoId}/comprobante`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo cargar el comprobante");
  const blob = await res.blob();
  // Un comprobante puede venir en PDF: pintarlo con <img> daba una imagen ROTA.
  return { url: URL.createObjectURL(blob), esPdf: !blob.type.startsWith("image/") };
}
