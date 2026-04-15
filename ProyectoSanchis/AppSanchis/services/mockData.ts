// ─── DATOS MOCK ────────────────────────────────────────────────────────────────
// Reemplaza estas funciones con llamadas reales a callKw() cuando conectes Odoo.

export interface Parte {
  id: number;
  name: string;
  cliente_id: [number, string];
  state: 'no_iniciado' | 'en_curso' | 'pausado' | 'finalizado';
  equipo_ids: number[];
  write_date: string;
  factura_id?: [number, string];
  actividad_ids: number[];
}

export interface Actividad {
  id: number;
  name: string;
  parte_id: [number, string];
  hora_inicio?: string;
  hora_fin?: string;
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

// ─── Partes ────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

export const MOCK_PARTES: Parte[] = [
  {
    id: 1,
    name: 'PT-2026-0042',
    cliente_id: [10, 'Construcciones Martínez S.L.'],
    state: 'en_curso',
    equipo_ids: [1],
    write_date: `${today} 08:30:00`,
    factura_id: [5, 'FAC/2026/0018'],
    actividad_ids: [1],
  },
  {
    id: 2,
    name: 'PT-2026-0043',
    cliente_id: [11, 'Reformas García & Hijos'],
    state: 'no_iniciado',
    equipo_ids: [1],
    write_date: `${today} 09:00:00`,
    actividad_ids: [2],
  },
  {
    id: 3,
    name: 'PT-2026-0044',
    cliente_id: [12, 'Instalaciones Pérez'],
    state: 'no_iniciado',
    equipo_ids: [],
    write_date: `${today} 07:45:00`,
    actividad_ids: [3],
  },
  {
    id: 4,
    name: 'PT-2026-0041',
    cliente_id: [9, 'Grupo Inmobiliario Torres'],
    state: 'no_iniciado',
    equipo_ids: [],
    write_date: `${today} 06:00:00`,
    actividad_ids: [4],
  },
  {
    id: 5,
    name: 'PT-2026-0038',
    cliente_id: [8, 'Cerámicas del Levante'],
    state: 'finalizado',
    equipo_ids: [1],
    write_date: '2026-03-28 17:00:00',
    factura_id: [3, 'FAC/2026/0015'],
    actividad_ids: [5],
  },
  {
    id: 6,
    name: 'PT-2026-0035',
    cliente_id: [7, 'Taller Mecánico Roca'],
    state: 'finalizado',
    equipo_ids: [1],
    write_date: '2026-03-25 16:30:00',
    actividad_ids: [6],
  },
  {
    id: 7,
    name: 'PT-2026-0031',
    cliente_id: [6, 'Hostelería Mar i Sol'],
    state: 'finalizado',
    equipo_ids: [2],
    write_date: '2026-03-20 15:00:00',
    actividad_ids: [7],
  },
];

// ─── Actividades ───────────────────────────────────────────────────────────────
export const MOCK_ACTIVIDADES: Actividad[] = [
  { id: 1, name: 'Instalación climatización zona norte', parte_id: [1, 'PT-2026-0042'], hora_inicio: `${today} 08:30:00` },
  { id: 2, name: 'Revisión sistema eléctrico', parte_id: [2, 'PT-2026-0043'] },
  { id: 3, name: 'Mantenimiento calderas', parte_id: [3, 'PT-2026-0044'] },
  { id: 4, name: 'Instalación ventilación', parte_id: [4, 'PT-2026-0041'] },
  { id: 5, name: 'Sustitución compresor', parte_id: [5, 'PT-2026-0038'], hora_inicio: '2026-03-28 09:00:00', hora_fin: '2026-03-28 17:00:00' },
  { id: 6, name: 'Revisión anual equipo split', parte_id: [6, 'PT-2026-0035'], hora_inicio: '2026-03-25 08:00:00', hora_fin: '2026-03-25 16:30:00' },
  { id: 7, name: 'Instalación bomba de calor', parte_id: [7, 'PT-2026-0031'], hora_inicio: '2026-03-20 07:30:00', hora_fin: '2026-03-20 15:00:00' },
];

// ─── Materiales ────────────────────────────────────────────────────────────────
export const MOCK_MATERIALES: Material[] = [
  { id: 1, product_id: [101, 'Tubo cobre 22mm'], cantidad: 3, uom_id: [1, 'metro'], actividad_id: 1, a_pedir: false },
  { id: 2, product_id: [102, 'Gas R-410A'], cantidad: 1, uom_id: [2, 'kg'], actividad_id: 1, a_pedir: false },
  { id: 3, product_id: [103, 'Filtro secador'], cantidad: 2, uom_id: [3, 'unidad'], actividad_id: 1, a_pedir: true },
];

// ─── Productos ─────────────────────────────────────────────────────────────────
export const MOCK_PRODUCTOS: Producto[] = [
  { id: 101, name: 'Tubo cobre 22mm', uom_id: [1, 'metro'] },
  { id: 102, name: 'Gas R-410A', uom_id: [2, 'kg'] },
  { id: 103, name: 'Filtro secador', uom_id: [3, 'unidad'] },
  { id: 104, name: 'Válvula expansión', uom_id: [3, 'unidad'] },
  { id: 105, name: 'Cable eléctrico 2.5mm', uom_id: [1, 'metro'] },
  { id: 106, name: 'Termostato digital', uom_id: [3, 'unidad'] },
  { id: 107, name: 'Tubo flexible aislado', uom_id: [1, 'metro'] },
  { id: 108, name: 'Tornillería inox M6', uom_id: [4, 'juego'] },
  { id: 109, name: 'Refrigerante R-32', uom_id: [2, 'kg'] },
  { id: 110, name: 'Soporte mural universal', uom_id: [3, 'unidad'] },
];
