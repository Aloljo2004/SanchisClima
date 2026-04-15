import { callKw, authenticate as odooAuthenticate } from './odoo';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ActividadResumen {
  id: number;
  name: string;
  hora_inicio?: string | false;
  hora_fin?: string | false;
}

export interface Parte {
  id: number;
  name: string;
  cliente_id: [number, string] | false;
  state: 'no_iniciado' | 'en_curso' | 'pausado' | 'finalizado';
  equipo_ids: number[];
  write_date: string;
  factura_id?: [number, string] | false;
  actividad_ids: number[];
  actividades?: ActividadResumen[];
}

export interface Actividad {
  id: number;
  name: string;
  parte_id: [number, string];
  hora_inicio?: string | false;
  hora_fin?: string | false;
}

export interface ActividadEnriquecida extends Actividad {
  parte_name: string;
  cliente_id: [number, string] | false;
  factura_id?: [number, string] | false;
  parte_state: 'no_iniciado' | 'en_curso' | 'pausado' | 'finalizado';
}

export interface Material {
  id: number;
  product_id: [number, string];
  cantidad: number;
  uom_id: [number, string];
  actividad_id: number;
  a_pedir?: boolean;
}

export interface Producto {
  id: number;
  name: string;
  uom_id: [number, string];
}

const PARTE_FIELDS = ['id', 'nombre_parte', 'cliente_id', 'state', 'equipo_ids', 'write_date', 'factura_id', 'actividad_ids'];
const ACTIVIDAD_FIELDS = ['id', 'name', 'proyecto_id', 'hora_inicio', 'hora_fin', 'equipo_ids'];

// Mapea nombre_parte como name para compatibilidad con el resto de la app
const mapParte = (p: any): Parte => ({
  ...p,
  name: p.nombre_parte || ('Parte ' + p.id),
});

const mapActividad = (a: any): Actividad => ({
  ...a,
  name: a.name,
  parte_id: a.proyecto_id
});

// ─── Helper: enriquecer actividades con datos de su parte ───────
async function enrichActividadesWithParte(actividades: Actividad[]): Promise<ActividadEnriquecida[]> {
  if (actividades.length === 0) return [];
  const parteIds = Array.from(new Set(actividades.map(a => a.parte_id && a.parte_id[0]).filter(Boolean)));
  
  if (parteIds.length === 0) return actividades as ActividadEnriquecida[];

  const partes = await callKw('jornada.proyecto', 'search_read', [[
    ['id', 'in', parteIds]
  ]], { fields: PARTE_FIELDS, limit: 500 });

  const partesMap = Object.fromEntries(partes.map((p: any) => [p.id, mapParte(p)]));

  return actividades.map(a => {
    const pId = a.parte_id ? a.parte_id[0] : 0;
    const parte = partesMap[pId];
    return {
      ...a,
      parte_name: parte ? parte.name : 'Desconocido',
      cliente_id: parte ? parte.cliente_id : false,
      factura_id: parte ? parte.factura_id : false,
      parte_state: parte ? parte.state : 'no_iniciado',
    };
  });
}

// ─── Actividades de hoy ────────────────────────────────────────────────
export async function getActividadesHoy(): Promise<ActividadEnriquecida[]> {
  const dayStr = format(new Date(), 'EEEE', { locale: es });
  const dayRaw = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
  const dayName = dayRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const actividadesRaw: any[] = await callKw('jornada.actividad', 'search_read', [[
    ['task_id.stage_id.name', 'ilike', dayName]
  ]], { fields: ACTIVIDAD_FIELDS, limit: 100 });

  const actividades = actividadesRaw.map(mapActividad);
  
  // Excluir las que pertenecen a partes finalizados
  const enriquecidas = await enrichActividadesWithParte(actividades);
  return enriquecidas.filter(a => a.parte_state !== 'finalizado');
}

// ─── Mis actividades ───────────────────────────────────────────────────
export async function getMisActividades(uid: number): Promise<ActividadEnriquecida[]> {
  const actividadesRaw: any[] = await callKw('jornada.actividad', 'search_read', [[
    ['equipo_ids', 'in', [uid]],
  ]], { fields: ACTIVIDAD_FIELDS, limit: 200 });

  const actividades = actividadesRaw.map(mapActividad);
  
  // Excluir partes finalizados y actividades ya finalizadas
  const enriquecidas = await enrichActividadesWithParte(actividades);
  return enriquecidas.filter(a => a.parte_state !== 'finalizado' && !a.hora_fin);
}

// ─── Sin asignar ──────────────────────────────────────────────────
export async function getActividadesSinAsignar(): Promise<ActividadEnriquecida[]> {
  const actividadesRaw: any[] = await callKw('jornada.actividad', 'search_read', [[
    ['equipo_ids', '=', false],
  ]], { fields: ACTIVIDAD_FIELDS, limit: 500 });

  const actividades = actividadesRaw.map(mapActividad);
  
  // Excluir partes finalizados
  const enriquecidas = await enrichActividadesWithParte(actividades);
  return enriquecidas.filter(a => a.parte_state !== 'finalizado');
}

// ─── Histórico ────────────────────────────────────────────────────
// Devolvemos las actividades que están finalizadas O que su parte está finalizado
export async function getActividadesHistorico(offset = 0, limit = 50): Promise<ActividadEnriquecida[]> {
  const actividadesRaw: any[] = await callKw('jornada.actividad', 'search_read', [[
    ['hora_fin', '!=', false]
  ]], { fields: ACTIVIDAD_FIELDS, limit, offset, order: 'hora_fin desc' });

  const actividades = actividadesRaw.map(mapActividad);
  return enrichActividadesWithParte(actividades);
}

// ─── Por ID (Parte) ───────────────────────────────────────────────────────
export async function getParteById(id: number): Promise<Parte | null> {
  const result: any[] = await callKw('jornada.proyecto', 'search_read', [[
    ['id', '=', id],
  ]], { fields: PARTE_FIELDS, limit: 1 });
  if (!result[0]) return null;
  return mapParte(result[0]);
}

// ─── Actividad por ID ─────────────────────────────────────────────
export async function getActividadById(id: number): Promise<Actividad | null> {
  const result: any[] = await callKw('jornada.actividad', 'search_read', [[
    ['id', '=', id],
  ]], { fields: ACTIVIDAD_FIELDS, limit: 1 });
  
  if (result.length > 0) {
    return mapActividad(result[0]);
  }
  return null;
}

export async function getActividadEnriquecidaById(id: number): Promise<ActividadEnriquecida | null> {
  const act = await getActividadById(id);
  if (!act) return null;
  const enriched = await enrichActividadesWithParte([act]);
  return enriched[0];
}

export { authenticate as odooLogin } from './odoo';
