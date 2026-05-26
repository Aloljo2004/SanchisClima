/**
 * Servicio de Asistencias — módulo hr.attendance de Odoo
 * Modelo principal: hr.attendance
 * Campos clave:
 *   - employee_id  (Many2one → hr.employee)
 *   - check_in     (Datetime UTC, "YYYY-MM-DD HH:MM:SS")
 *   - check_out    (Datetime UTC, False si todavía dentro)
 */

import { callKw } from './odoo';

// ─── Utilidades de fecha ──────────────────────────────────────────────────────

/** Convierte un Date local a string UTC para Odoo */
function toOdooDatetime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/** Convierte un string UTC de Odoo a Date local */
function fromOdooDatetime(str) {
  if (!str) return null;
  // Odoo devuelve "YYYY-MM-DD HH:MM:SS" en UTC
  return new Date(str.replace(' ', 'T') + 'Z');
}

/** Formatea un Date como "HH:MM" en hora local */
function fmtHora(date) {
  if (!date) return '--:--';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formatea un Date como "YYYY-MM-DD" en hora local */
function fmtFecha(date) {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ─── Obtener employee_id del usuario actual ───────────────────────────────────

/**
 * Busca el hr.employee vinculado al usuario logueado.
 * Intenta tres métodos en orden:
 *   1. Por user_id (relación directa con res.users)
 *   2. Por name  (nombre completo)
 *   3. Por work_email (email del usuario como login)
 *
 * @param {number} uid       – ID de res.users
 * @param {string} fullName  – Nombre completo (fallback)
 * @param {string} username  – Login / email (fallback)
 * @returns {number|null}    – ID de hr.employee o null
 */
export async function getEmployeeId(uid, fullName = null, username = null) {
  try {
    // 1. Por user_id
    if (uid) {
      const r1 = await callKw(
        'hr.employee',
        'search_read',
        [[['user_id', '=', uid]]],
        { fields: ['id', 'name'], limit: 1 }
      );
      if (r1 && r1.length > 0) {
        console.log('[Odoo] Empleado encontrado por user_id:', r1[0].name);
        return r1[0].id;
      }
    }

    // 2. Por nombre completo
    if (fullName) {
      const r2 = await callKw(
        'hr.employee',
        'search_read',
        [[['name', '=', fullName]]],
        { fields: ['id', 'name'], limit: 1 }
      );
      if (r2 && r2.length > 0) {
        console.log('[Odoo] Empleado encontrado por name:', r2[0].name);
        return r2[0].id;
      }
    }

    // 3. Por email de trabajo (work_email)
    if (username) {
      const r3 = await callKw(
        'hr.employee',
        'search_read',
        [[['work_email', '=', username]]],
        { fields: ['id', 'name'], limit: 1 }
      );
      if (r3 && r3.length > 0) {
        console.log('[Odoo] Empleado encontrado por work_email:', r3[0].name);
        return r3[0].id;
      }
    }

    console.warn('[Odoo] No se encontró ningún empleado para uid:', uid, 'name:', fullName, 'email:', username);
    return null;
  } catch (e) {
    console.error('[Odoo] getEmployeeId error:', e.message);
    return null;
  }
}

// ─── Obtener calendario de trabajo ──────────────────────────────────────────

/**
 * Devuelve las líneas del calendario asociado al empleado o el calendario por defecto "Horas de prueba para fichajes".
 * @param {number|null} employeeId 
 */
export async function getEmployeeCalendar(employeeId) {
  try {
    let targetCalendarId = null;

    if (employeeId) {
      const empRes = await callKw(
        'hr.employee',
        'search_read',
        [[['id', '=', employeeId]]],
        { fields: ['resource_calendar_id'], limit: 1 }
      );
      if (empRes && empRes.length > 0 && empRes[0].resource_calendar_id) {
        targetCalendarId = empRes[0].resource_calendar_id[0];
      }
    }

    // Si el empleado no tiene calendario, buscamos "Horas de prueba para fichajes"
    if (!targetCalendarId) {
      const calRes = await callKw(
        'resource.calendar',
        'search_read',
        [[['name', '=', 'Horas de prueba para fichajes']]],
        { fields: ['id'], limit: 1 }
      );
      if (calRes && calRes.length > 0) {
        targetCalendarId = calRes[0].id;
      }
    }

    if (!targetCalendarId) {
      console.log('[Odoo] No se encontró ningún calendario para las alarmas.');
      return [];
    }

    // Buscamos las líneas de asistencia (horarios)
    const attendances = await callKw(
      'resource.calendar.attendance',
      'search_read',
      [[['calendar_id', '=', targetCalendarId]]],
      { fields: ['name', 'dayofweek', 'hour_from', 'hour_to'] }
    );

    return attendances || [];
  } catch (e) {
    console.error('[Odoo] getEmployeeCalendar error:', e.message);
    return [];
  }
}

// ─── Buscar asistencia abierta (sin check_out) ────────────────────────────────

/**
 * Devuelve la asistencia abierta más reciente del empleado (check_out = false).
 * @returns {{ id: number, check_in: string } | null}
 */
export async function getOpenAttendance(employeeId) {
  try {
    const result = await callKw(
      'hr.attendance',
      'search_read',
      [[
        ['employee_id', '=', employeeId],
        ['check_out', '=', false],
      ]],
      { fields: ['id', 'check_in'], limit: 1, order: 'check_in desc' }
    );
    if (result && result.length > 0) {
      console.log('[Odoo] Asistencia abierta encontrada, id:', result[0].id);
      return result[0];
    }
    return null;
  } catch (e) {
    console.error('[Odoo] getOpenAttendance error:', e.message);
    return null;
  }
}

// ─── Registrar ENTRADA ────────────────────────────────────────────────────────

/**
 * Crea un registro hr.attendance con check_in = ahora (UTC).
 * @param {number} employeeId
 * @returns {{ id: number, check_in: Date }}
 * @throws si la llamada a Odoo falla
 */
export async function registrarEntrada(employeeId) {
  if (!employeeId) {
    throw new Error('No se encontró el empleado vinculado. Comprueba la configuración en Odoo.');
  }
  const checkInUtc = toOdooDatetime();
  console.log('[Odoo] Registrando ENTRADA para employee_id:', employeeId, '| check_in UTC:', checkInUtc);
  const id = await callKw(
    'hr.attendance',
    'create',
    [{ employee_id: employeeId, check_in: checkInUtc }]
  );
  console.log('[Odoo] Asistencia creada, id:', id);
  return { id, check_in: new Date() };
}

// ─── Registrar SALIDA ─────────────────────────────────────────────────────────

/**
 * Escribe check_out en la asistencia abierta más reciente.
 * @param {number} employeeId
 * @returns {{ id: number, check_out: Date }}
 * @throws si no hay asistencia abierta o la llamada a Odoo falla
 */
export async function registrarSalida(employeeId) {
  if (!employeeId) {
    throw new Error('No se encontró el empleado vinculado. Comprueba la configuración en Odoo.');
  }
  const open = await getOpenAttendance(employeeId);
  if (!open) {
    throw new Error('No hay ninguna entrada registrada sin cerrar. Registra primero una ENTRADA.');
  }
  const checkOutUtc = toOdooDatetime();
  console.log('[Odoo] Registrando SALIDA para attendance id:', open.id, '| check_out UTC:', checkOutUtc);
  await callKw(
    'hr.attendance',
    'write',
    [[open.id], { check_out: checkOutUtc }]
  );
  console.log('[Odoo] Asistencia cerrada, id:', open.id);
  return { id: open.id, check_out: new Date() };
}

// ─── Obtener historial ────────────────────────────────────────────────────────

/**
 * Lee los últimos N registros de asistencia del empleado desde Odoo.
 * @param {number} employeeId
 * @param {number} limit
 * @returns {Array<{ id, tipo, fecha, hora, timestamp, odooId }>}
 */
export async function getHistorialAsistencias(employeeId, limit = 50) {
  if (!employeeId) return [];
  try {
    const records = await callKw(
      'hr.attendance',
      'search_read',
      [[['employee_id', '=', employeeId]]],
      {
        fields: ['id', 'check_in', 'check_out'],
        limit,
        order: 'check_in desc',
      }
    );

    const fichajes = [];
    for (const rec of records) {
      const checkIn = fromOdooDatetime(rec.check_in);
      if (checkIn) {
        fichajes.push({
          id: `${rec.id}_in`,
          tipo: 'Entrada',
          fecha: fmtFecha(checkIn),
          hora: fmtHora(checkIn),
          timestamp: checkIn.getTime(),
          odooId: rec.id,
        });
      }
      const checkOut = fromOdooDatetime(rec.check_out);
      if (checkOut) {
        fichajes.push({
          id: `${rec.id}_out`,
          tipo: 'Salida',
          fecha: fmtFecha(checkOut),
          hora: fmtHora(checkOut),
          timestamp: checkOut.getTime(),
          odooId: rec.id,
        });
      }
    }

    return fichajes.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error('[Odoo] getHistorialAsistencias error:', e.message);
    return [];
  }
}
