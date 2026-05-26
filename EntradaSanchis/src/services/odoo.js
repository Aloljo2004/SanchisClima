import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
export const BASE_URL = 'https://jsc.siscentro.com';
export const DB_NAME = 'odoo';

// ─── INSTANCIA AXIOS ──────────────────────────────────────────────────────────
const odooClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Session state
let _sessionId = null;
let _allowedCompanyIds = [];

export const setSessionId = (sid) => { _sessionId = sid; };
export const setAllowedCompanyIds = (ids) => { _allowedCompanyIds = ids || []; };

/**
 * Actualiza la URL base del cliente Axios en tiempo real.
 * Se llama al guardar la dirección del servidor en Configuración
 * o al restaurar la sesión del bootstrap.
 */
export const setBaseUrl = (url) => {
  if (!url) return;
  let formatted = url.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = 'https://' + formatted;
  }
  odooClient.defaults.baseURL = formatted;
  console.log('[Odoo] baseURL actualizada a:', formatted);
};

// Inject session cookie in every request
odooClient.interceptors.request.use((config) => {
  if (_sessionId) {
    config.headers['Cookie'] = `session_id=${_sessionId}`;
  }
  return config;
});

// ─── GENERIC callKw ───────────────────────────────────────────────────────────
export async function callKw(model, method, args, kwargs = {}) {
  const context = { ...kwargs.context };
  if (_allowedCompanyIds.length > 0) {
    context.allowed_company_ids = _allowedCompanyIds;
  }

  const response = await odooClient.post(`/web/dataset/call_kw/${model}/${method}`, {
    jsonrpc: '2.0',
    method: 'call',
    id: Date.now(),
    params: { model, method, args, kwargs: { ...kwargs, context } },
  });

  if (response.data?.error) {
    const msg = response.data.error.data?.message || response.data.error.message || 'Error Odoo';
    throw new Error(msg);
  }
  return response.data.result;
}

// ─── AUTHENTICATE ─────────────────────────────────────────────────────────────
export async function authenticate(login, password) {
  const response = await odooClient.post('/web/session/authenticate', {
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

  // Extract session_id from Set-Cookie header
  const setCookie = response.headers['set-cookie'];
  let sessionId = '';
  if (setCookie) {
    const match = setCookie.join(';').match(/session_id=([^;]+)/);
    if (match) sessionId = match[1];
  }

  // Get allowed company IDs
  let companyIds = [];
  if (result.user_companies?.allowed_companies) {
    companyIds = Object.keys(result.user_companies.allowed_companies).map(Number);
  } else if (result.company_ids) {
    companyIds = result.company_ids;
  } else if (result.company_id) {
    companyIds = [Array.isArray(result.company_id) ? result.company_id[0] : result.company_id];
  }

  return {
    uid: result.uid,
    sessionId,
    username: login,
    fullName: result.partner_display_name || result.name || login,
    companyIds,
  };
}

// ─── SECURE STORE HELPERS ─────────────────────────────────────────────────────
const KEYS = {
  SESSION_ID: 'sc_session_id',
  UID: 'sc_uid',
  USERNAME: 'sc_username',
  PASSWORD: 'sc_password',
  FULL_NAME: 'sc_full_name',
  COMPANY_IDS: 'sc_company_ids',
  EMPLOYEE_ID: 'sc_employee_id',
};

export async function saveCredentials(username, password) {
  await SecureStore.setItemAsync(KEYS.USERNAME, username);
  await SecureStore.setItemAsync(KEYS.PASSWORD, password);
}

export async function getStoredCredentials() {
  const username = await SecureStore.getItemAsync(KEYS.USERNAME);
  const password = await SecureStore.getItemAsync(KEYS.PASSWORD);
  if (username && password) return { username, password };
  return null;
}

export async function saveSession(uid, sessionId, fullName, companyIds, employeeId) {
  await SecureStore.setItemAsync(KEYS.UID, String(uid));
  await SecureStore.setItemAsync(KEYS.SESSION_ID, sessionId);
  await SecureStore.setItemAsync(KEYS.FULL_NAME, fullName);
  await SecureStore.setItemAsync(KEYS.COMPANY_IDS, JSON.stringify(companyIds || []));
  if (employeeId) {
    await SecureStore.setItemAsync(KEYS.EMPLOYEE_ID, String(employeeId));
  }
}

export async function getStoredSession() {
  const uid = await SecureStore.getItemAsync(KEYS.UID);
  const sessionId = await SecureStore.getItemAsync(KEYS.SESSION_ID);
  const username = await SecureStore.getItemAsync(KEYS.USERNAME);
  const fullName = await SecureStore.getItemAsync(KEYS.FULL_NAME);
  const companyIdsStr = await SecureStore.getItemAsync(KEYS.COMPANY_IDS);
  const employeeId = await SecureStore.getItemAsync(KEYS.EMPLOYEE_ID);

  if (!uid || !sessionId || !username) return null;

  let companyIds = [];
  try { companyIds = JSON.parse(companyIdsStr || '[]'); } catch (_) { }

  return {
    uid: Number(uid),
    sessionId,
    username,
    fullName: fullName || username,
    companyIds,
    employeeId: employeeId ? Number(employeeId) : null,
  };
}

export async function clearSession() {
  for (const [keyName, keyValue] of Object.entries(KEYS)) {
    if (keyName === 'USERNAME' || keyName === 'PASSWORD') continue;
    try { await SecureStore.deleteItemAsync(keyValue); } catch (_) { }
  }
}

export default odooClient;
