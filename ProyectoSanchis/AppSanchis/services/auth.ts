import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const KEYS = {
  SESSION_ID: 'odoo_session_id',
  UID: 'odoo_uid',
  USERNAME: 'odoo_username',
  PASSWORD: 'odoo_password',
  FULL_NAME: 'odoo_full_name',
};

// ─── Guardar / leer credenciales ──────────────────────────────────
export async function saveCredentials(username: string, password: string) {
  await SecureStore.setItemAsync(KEYS.USERNAME, username);
  await SecureStore.setItemAsync(KEYS.PASSWORD, password);
}

export async function getStoredCredentials(): Promise<{ username: string; password: string } | null> {
  const username = await SecureStore.getItemAsync(KEYS.USERNAME);
  const password = await SecureStore.getItemAsync(KEYS.PASSWORD);
  if (username && password) return { username, password };
  return null;
}

export async function saveSession(uid: number, sessionId: string, fullName: string) {
  await SecureStore.setItemAsync(KEYS.UID, String(uid));
  await SecureStore.setItemAsync(KEYS.SESSION_ID, sessionId);
  await SecureStore.setItemAsync(KEYS.FULL_NAME, fullName);
}

export async function getStoredSession(): Promise<{ uid: number; sessionId: string; username: string; fullName: string } | null> {
  const uid = await SecureStore.getItemAsync(KEYS.UID);
  const sessionId = await SecureStore.getItemAsync(KEYS.SESSION_ID);
  const username = await SecureStore.getItemAsync(KEYS.USERNAME);
  const fullName = await SecureStore.getItemAsync(KEYS.FULL_NAME);
  if (uid && sessionId && username) {
    return { uid: Number(uid), sessionId, username, fullName: fullName || username };
  }
  return null;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEYS.SESSION_ID);
  await SecureStore.deleteItemAsync(KEYS.UID);
  await SecureStore.deleteItemAsync(KEYS.FULL_NAME);
}

// ─── Biometría ────────────────────────────────────────────────────
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Accede a Partes de Trabajo',
    fallbackLabel: 'Usar contraseña',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function getSupportedBiometricType(): Promise<'face' | 'fingerprint' | 'none'> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  return 'none';
}
