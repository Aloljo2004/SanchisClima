import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  authenticate,
  setSessionId,
  setAllowedCompanyIds,
  setBaseUrl,
  saveCredentials,
  getStoredCredentials,
  saveSession,
  getStoredSession,
  clearSession,
} from '../services/odoo';

import {
  getEmployeeId,
  getEmployeeCalendar,
  getHistorialAsistencias,
  registrarEntrada,
  registrarSalida,
} from '../services/asistencias';

export const AppContext = createContext();

const MOCK_ALERTAS = [
  { id: '1', titulo: 'Entrada', hora: '07:57', dias: ['L', 'M', 'X', 'J', 'V'], activa: true },
  { id: '2', titulo: 'Salida', hora: '13:15', dias: ['V'], activa: true },
  { id: '3', titulo: 'Salida', hora: '14:14', dias: ['L', 'M', 'X'], activa: true },
  { id: '4', titulo: 'Salida', hora: '16:30', dias: ['J'], activa: true },
];

const floatToHHMM = (timeFloat) => {
  const h = Math.floor(timeFloat);
  const m = Math.round((timeFloat - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);          // { nombre, username, uid, employeeId }
  const [rememberSession, setRememberSession] = useState(false);
  const [fichajes, setFichajes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [serverUrl, setServerUrl] = useState('jsc.siscentro.com');
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [odooError, setOdooError] = useState(null);

  // Helper: load user-specific alertas from AsyncStorage and sync with Odoo
  const loadAlertas = async (username, employeeId) => {
    const key = String(username).toLowerCase().trim();
    let storedAlertas = [];
    let deletedOdooIds = [];
    
    try {
      const stored = await AsyncStorage.getItem(`@alertas_${key}`);
      if (stored) storedAlertas = JSON.parse(stored);
      
      const storedDeleted = await AsyncStorage.getItem(`@deleted_odoo_${key}`);
      if (storedDeleted) deletedOdooIds = JSON.parse(storedDeleted);
    } catch (e) {}

    // Fetch from Odoo
    try {
       const attendances = await getEmployeeCalendar(employeeId);
       const ODOO_DAY_MAP = { '0': 'L', '1': 'M', '2': 'X', '3': 'J', '4': 'V', '5': 'S', '6': 'D' };
       const inMap = {};
       const outMap = {};
       
       for(const line of attendances) {
         const d = ODOO_DAY_MAP[line.dayofweek];
         if (!d) continue;
         const inTime = floatToHHMM(line.hour_from);
         const outTime = floatToHHMM(line.hour_to);
         
         if(!inMap[inTime]) inMap[inTime] = [];
         if(!inMap[inTime].includes(d)) inMap[inTime].push(d);
      
         if(!outMap[outTime]) outMap[outTime] = [];
         if(!outMap[outTime].includes(d)) outMap[outTime].push(d);
       }
       
       const odooAlarms = [];
       Object.keys(inMap).forEach((time) => {
         odooAlarms.push({ id: `odoo_in_${time}`, titulo: 'Entrada', hora: time, dias: inMap[time], activa: true, isOdoo: true });
       });
       Object.keys(outMap).forEach((time) => {
         odooAlarms.push({ id: `odoo_out_${time}`, titulo: 'Salida', hora: time, dias: outMap[time], activa: true, isOdoo: true });
       });

       const merged = [...storedAlertas];
       
       for (const oa of odooAlarms) {
          if (deletedOdooIds.includes(oa.id)) continue;
          const existingIdx = merged.findIndex(a => a.id === oa.id);
          if (existingIdx !== -1) {
            merged[existingIdx] = { ...merged[existingIdx], dias: oa.dias, hora: oa.hora, titulo: oa.titulo, isOdoo: true };
          } else {
            merged.push(oa);
          }
       }
       
       setAlertas(merged);
       await AsyncStorage.setItem(`@alertas_${key}`, JSON.stringify(merged));

    } catch (e) {
      console.warn('Odoo calendar fetch error:', e);
      if (storedAlertas.length === 0) {
        setAlertas(MOCK_ALERTAS);
      } else {
        setAlertas(storedAlertas);
      }
    }
  };

  // Helper: load fichajes from Odoo (with offline fallback)
  const loadFichajes = async (employeeId, username) => {
    try {
      const odooFichajes = await getHistorialAsistencias(employeeId, 60);
      setFichajes(odooFichajes);
      // Cache locally
      const key = String(username).toLowerCase().trim();
      await AsyncStorage.setItem(`@fichajes_${key}`, JSON.stringify(odooFichajes));
    } catch (e) {
      console.warn('loadFichajes Odoo error, using cache:', e);
      const key = String(username).toLowerCase().trim();
      const cached = await AsyncStorage.getItem(`@fichajes_${key}`);
      setFichajes(cached ? JSON.parse(cached) : []);
    }
  };

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      try {

        // Restaurar URL del servidor guardada
        const storedServer = await AsyncStorage.getItem('@serverUrl');
        if (storedServer) {
          setServerUrl(storedServer);
          setBaseUrl(storedServer);
        } else {
          // URL por defecto
          setBaseUrl('https://jsc.siscentro.com');
        }

        const session = await getStoredSession();
        if (session) {
          // Restore Odoo session
          setSessionId(session.sessionId);
          setAllowedCompanyIds(session.companyIds);

          let validEmployeeId = session.employeeId;
          if (Number.isNaN(validEmployeeId) || !validEmployeeId) {
            console.log('[Bootstrap] employeeId is NaN or invalid. Attempting to recover...');
            validEmployeeId = await getEmployeeId(session.uid, session.fullName, session.username);
            if (validEmployeeId) {
              await saveSession(session.uid, session.sessionId, session.fullName, session.companyIds, validEmployeeId);
            }
          }

          const userData = {
            nombre:     session.fullName,
            username:   session.username,
            uid:        session.uid,
            employeeId: validEmployeeId,
          };
          setUser(userData);
          setIsLoggedIn(true);
          setRememberSession(true);

          await Promise.all([
            loadFichajes(session.employeeId, session.username),
            loadAlertas(session.username, session.employeeId),
          ]);
        }
      } catch (e) {
        console.error('Bootstrap error:', e);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  // ─── Login con usuario/contraseña → Odoo ───────────────────────────────────
  const login = async (username, password, remember) => {
    setOdooError(null);
    try {
      // 1. Authenticate against Odoo
      const result = await authenticate(username, password);

      // 2. Configure Odoo client session
      setSessionId(result.sessionId);
      setAllowedCompanyIds(result.companyIds);

      // 3. Get employee record linked to this user (with 3-level fallback)
      const employeeId = await getEmployeeId(result.uid, result.fullName, username);

      if (!employeeId) {
        console.warn('[Login] No se encontró ficha de empleado en hr.employee para este usuario.');
      }

      // 4. Build user object
      const userData = {
        nombre:     result.fullName,
        username:   result.username,
        uid:        result.uid,
        employeeId,
      };
      setUser(userData);
      setIsLoggedIn(true);
      setRememberSession(remember);

      // 5. Persist credentials if "remember"
      if (remember) {
        await saveCredentials(username, password);
        await saveSession(result.uid, result.sessionId, result.fullName, result.companyIds, employeeId);
      }

      // 6. Load data
      await Promise.all([
        loadFichajes(employeeId, username),
        loadAlertas(username, employeeId),
      ]);

    } catch (e) {
      const msg = e.message || 'Error de conexión con el servidor';
      setOdooError(msg);
      throw e;
    }
  };

  // ─── Login biométrico (reutiliza credenciales guardadas) ───────────────────
  const loginBiometric = async () => {
    try {
      const creds = await getStoredCredentials();
      if (!creds) throw new Error('No hay credenciales guardadas. Inicia sesión primero.');
      await login(creds.username, creds.password, true);
      return true;
    } catch (e) {
      console.error('loginBiometric error:', e);
      return false;
    }
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    setIsLoggedIn(false);
    setUser(null);
    setFichajes([]);
    setAlertas([]);
    setOdooError(null);
    setSessionId(null);
    setAllowedCompanyIds([]);
    try {
      await clearSession();
      setRememberSession(false);
    } catch (e) { console.error(e); }
  };

  // ─── Registrar fichaje (ENTRADA o SALIDA) → Odoo ──────────────────────────
  /**
   * Registra una entrada o salida en Odoo.
   * @param {'Entrada'|'Salida'} tipo
   * @param {number} motivo – Número de motivo 1-10
   * @throws {Error} si falla la conexión o no hay employeeId
   */
  const addFichaje = async (tipo, motivo) => {
    const employeeId = user?.employeeId;
    if (!employeeId) {
      throw new Error(
        'No se encontró el empleado vinculado a este usuario en Odoo.\n\n' +
        'Comprueba que tu usuario tiene una ficha de empleado asociada en el módulo de Trabajadores.'
      );
    }

    if (tipo === 'Entrada') {
      await registrarEntrada(employeeId);
    } else {
      await registrarSalida(employeeId);
    }

    // Reload from Odoo to keep history in sync
    await loadFichajes(employeeId, user.username);
  };

  // ─── Guardar URL del servidor ──────────────────────────────────────────────
  const saveServerUrl = async (url) => {
    const formattedUrl = url.trim();
    setServerUrl(formattedUrl);
    setBaseUrl(formattedUrl);
    try { await AsyncStorage.setItem('@serverUrl', formattedUrl); } catch (e) { console.error(e); }
  };

  // ─── Alertas CRUD ─────────────────────────────────────────────────────────
  const _saveAlertas = async (updated) => {
    setAlertas(updated);
    const key = (user?.username || 'default').toLowerCase().trim();
    await AsyncStorage.setItem(`@alertas_${key}`, JSON.stringify(updated));
  };

  const addAlerta = async (alerta) => {
    const newAlerta = { ...alerta, id: String(Date.now()), activa: true };
    await _saveAlertas([newAlerta, ...alertas]);
  };

  const editAlerta = async (id, updatedAlerta) => {
    const updated = alertas.map((item) =>
      item.id === id ? { ...item, ...updatedAlerta } : item
    );
    await _saveAlertas(updated);
  };

  const deleteAlerta = async (id) => {
    const key = (user?.username || 'default').toLowerCase().trim();
    if (String(id).startsWith('odoo_')) {
       try {
         const storedDeleted = await AsyncStorage.getItem(`@deleted_odoo_${key}`);
         let deletedOdooIds = storedDeleted ? JSON.parse(storedDeleted) : [];
         if (!deletedOdooIds.includes(id)) {
            deletedOdooIds.push(id);
            await AsyncStorage.setItem(`@deleted_odoo_${key}`, JSON.stringify(deletedOdooIds));
         }
       } catch (e) {}
    }
    await _saveAlertas(alertas.filter((item) => item.id !== id));
  };

  const toggleAlerta = async (id) => {
    const updated = alertas.map((item) =>
      item.id === id ? { ...item, activa: !item.activa } : item
    );
    await _saveAlertas(updated);
  };

  const activeAlertsCount = alertas.filter((a) => a.activa).length;

  return (
    <AppContext.Provider
      value={{
        isLoggedIn, user, rememberSession, setRememberSession,
        fichajes, alertas, serverUrl, gpsEnabled, setGpsEnabled,
        loading, odooError,
        login, loginBiometric, logout,
        addFichaje, saveServerUrl,
        addAlerta, editAlerta, deleteAlerta, toggleAlerta,
        activeAlertsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
