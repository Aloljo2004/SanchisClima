import { callKw } from './odoo';

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

const MATERIAL_FIELDS = ['id', 'product_id', 'cantidad', 'uom_id', 'actividad_id', 'a_pedir'];

// ─── Buscar productos ─────────────────────────────────────────────
export async function searchProductos(query: string): Promise<Producto[]> {
  if (!query.trim()) return [];
  return callKw(
    'product.product',
    'search_read',
    [[['name', 'ilike', query], ['active', '=', true]]],
    { fields: ['id', 'name', 'uom_id'], limit: 20 }
  );
}

// ─── Materiales de una actividad ──────────────────────────────────
export async function getMaterialesByActividad(
  actividadId: number,
  aPedir = false
): Promise<Material[]> {
  // Si el campo a_pedir existe en el modelo, filtra por él
  // Si no existe, Odoo devolverá un error — en ese caso quita el filtro a_pedir
  try {
    return await callKw(
      'jornada.actividad.material',
      'search_read',
      [[
        ['actividad_id', '=', actividadId],
        ['a_pedir', '=', aPedir],
      ]],
      { fields: MATERIAL_FIELDS }
    );
  } catch {
    // Fallback si el campo a_pedir no existe en el módulo Odoo
    const all: Material[] = await callKw(
      'jornada.actividad.material',
      'search_read',
      [[['actividad_id', '=', actividadId]]],
      { fields: ['id', 'product_id', 'cantidad', 'uom_id', 'actividad_id'] }
    );
    return all;
  }
}

// ─── Añadir material ──────────────────────────────────────────────
export async function addMaterial(
  actividadId: number,
  product: Producto,
  cantidad: number,
  aPedir = false
): Promise<Material> {
  const vals: Record<string, any> = {
    product_id: product.id,
    cantidad,
    uom_id: product.uom_id[0],
    actividad_id: actividadId,
  };

  // Incluir a_pedir sólo si el campo existe (el módulo lo soporta)
  // Si falla, se reintenta sin él
  try {
    vals.a_pedir = aPedir;
    const newId: number = await callKw('jornada.actividad.material', 'create', [vals]);
    return {
      id: newId,
      product_id: [product.id, product.name],
      cantidad,
      uom_id: product.uom_id,
      actividad_id: actividadId,
      a_pedir: aPedir,
    };
  } catch {
    delete vals.a_pedir;
    const newId: number = await callKw('jornada.actividad.material', 'create', [vals]);
    return {
      id: newId,
      product_id: [product.id, product.name],
      cantidad,
      uom_id: product.uom_id,
      actividad_id: actividadId,
    };
  }
}

// ─── Eliminar material ────────────────────────────────────────────
export async function deleteMaterial(materialId: number): Promise<void> {
  await callKw('jornada.actividad.material', 'unlink', [[materialId]]);
}
