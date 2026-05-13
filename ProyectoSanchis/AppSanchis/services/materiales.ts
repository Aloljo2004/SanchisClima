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

// ─── Obtener/Buscar productos ──────────────────────────────────────
export async function getProductos(query: string = ''): Promise<Producto[]> {
  const domain: any[] = [['active', '=', true]];
  if (query.trim()) {
    domain.push(['name', 'ilike', query]);
  }
  
  return callKw(
    'product.product',
    'search_read',
    [domain],
    { 
      fields: ['id', 'name', 'uom_id'], 
      order: 'name asc', 
      limit: 100 // Limitamos a 100 para rendimiento, el buscador filtrará más
    }
  );
}

export async function searchProductos(query: string): Promise<Producto[]> {
  return getProductos(query);
}

// ─── Todos los materiales de una actividad (separados por a_pedir) ──
export async function getAllMaterialesByActividad(
  actividadId: number
): Promise<{ usados: Material[]; aPedir: Material[] }> {
  // Obtener materiales utilizados de la actividad
  const usados: Material[] = await callKw(
    'jornada.actividad.material',
    'search_read',
    [[['actividad_id', '=', actividadId]]],
    { fields: ['id', 'product_id', 'cantidad', 'uom_id', 'actividad_id'] }
  );

  // Para los materiales a pedir necesitamos conocer el parte (proyecto_id)
  const act = await callKw('jornada.actividad', 'search_read', [[['id', '=', actividadId]]], { fields: ['proyecto_id'], limit: 1 });
  const proyecto_id = act[0]?.proyecto_id ? act[0].proyecto_id[0] : null;

  let aPedir: Material[] = [];
  if (proyecto_id) {
    aPedir = await callKw(
      'jornada.material.faltante',
      'search_read',
      [[['proyecto_id', '=', proyecto_id], ['state', '=', 'pendiente']]],
      { fields: ['id', 'proyecto_id', 'product_id', 'cantidad', 'uom_id', 'fecha_prevista', 'state', 'notas'] }
    );
  }

  return { usados, aPedir };
}

// ─── Añadir material ──────────────────────────────────────────────
export async function addMaterial(
  actividadId: number,
  product: Producto,
  cantidad: number,
  aPedir = false
): Promise<Material> {
  if (aPedir) {
    // Si es a pedir, se envía al modelo jornada.material.faltante que depende del proyecto (parte)
    const act = await callKw('jornada.actividad', 'search_read', [[['id', '=', actividadId]]], { fields: ['proyecto_id'], limit: 1 });
    const proyecto_id = act[0]?.proyecto_id ? act[0].proyecto_id[0] : null;

    if (!proyecto_id) {
      throw new Error("No se pudo obtener el parte de la actividad para registrar el material faltante.");
    }

    const vals = {
      proyecto_id: proyecto_id,
      product_id: product.id,
      cantidad,
    };

    const newId: number = await callKw('jornada.material.faltante', 'create', [vals]);
    return {
      id: newId,
      product_id: [product.id, product.name],
      cantidad,
      uom_id: product.uom_id,
      proyecto_id: [proyecto_id, '']
    };
  } else {
    // Si es material utilizado, va a la actividad
    const vals = {
      product_id: product.id,
      cantidad,
      uom_id: product.uom_id[0],
      actividad_id: actividadId,
    };
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
export async function deleteMaterial(materialId: number, forPedir: boolean = false): Promise<void> {
  const model = forPedir ? 'jornada.material.faltante' : 'jornada.actividad.material';
  await callKw(model, 'unlink', [[materialId]]);
}
// ─── Actualizar cantidad de material ──────────────────────────────
export async function updateMaterial(
  materialId: number, 
  nuevaCantidad: number, 
  forPedir: boolean = false
): Promise<void> {
  const model = forPedir ? 'jornada.material.faltante' : 'jornada.actividad.material';
  await callKw(model, 'write', [[materialId], { cantidad: nuevaCantidad }]);
}
