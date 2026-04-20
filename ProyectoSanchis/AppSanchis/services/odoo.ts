import axios from 'axios';

// ─── CONFIGURACIÓN ────────────────────────────────────────────────
export const BASE_URL = 'https://odoopruebas.aleza.pro';
export const DB_NAME = 'odoo';

// ─── INSTANCIA AXIOS ──────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Interceptor para inyectar session_id en cada petición
let _sessionId: string | null = null;
export const setSessionId = (sid: string | null) => { _sessionId = sid; };

axiosInstance.interceptors.request.use((config) => {
  if (_sessionId) {
    config.headers['Cookie'] = `session_id=${_sessionId}`;
  }
  return config;
});

// ─── FUNCIÓN GENÉRICA callKw ──────────────────────────────────────
/**
 * Llama a un método de un modelo Odoo vía JSON-RPC.
 * @example
 * // Leer partes
 * await callKw('jornada.proyecto', 'search_read', [[['state','!=','finalizado']]], { fields: ['id','name'], limit: 50 });
 * // Escribir
 * await callKw('jornada.actividad', 'write', [[id], { hora_inicio: '2026-03-30 09:00:00' }]);
 * // Crear material
 * await callKw('jornada.actividad.material', 'create', [{ product_id: 5, cantidad: 2, actividad_id: 3 }]);
 */
export async function callKw(
  model: string,
  method: string,
  args: any[],
  kwargs: Record<string, any> = {}
): Promise<any> {
  const response = await axiosInstance.post(`/web/dataset/call_kw/${model}/${method}`, {
    jsonrpc: '2.0',
    method: 'call',
    id: Date.now(),
    params: { model, method, args, kwargs },
  });

  if (response.data?.error) {
    const msg = response.data.error.data?.message || response.data.error.message || 'Error desconocido';
    throw new Error(msg);
  }

  return response.data.result;
}

// ─── AUTENTICACIÓN ────────────────────────────────────────────────
export async function authenticate(login: string, password: string) {
  const response = await axiosInstance.post('/web/session/authenticate', {
    jsonrpc: '2.0',
    method: 'call',
    params: { db: DB_NAME, login, password },
  });

  if (response.data?.error) {
    throw new Error('Credenciales incorrectas');
  }

  const result = response.data?.result;
  if (!result?.uid || result.uid <= 0) {
    throw new Error('Usuario o contraseña incorrectos');
  }

  // Extraer session_id de la cookie de respuesta
  const setCookie = response.headers['set-cookie'];
  let sessionId = '';
  if (setCookie) {
    const match = setCookie.join(';').match(/session_id=([^;]+)/);
    if (match) sessionId = match[1];
  }

  return {
    uid: result.uid as number,
    sessionId,
    username: login,
    fullName: (result.partner_display_name || result.name || login) as string,
  };
}

export default axiosInstance;
