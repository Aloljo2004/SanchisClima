import { callKw } from './odoo';
import { format } from 'date-fns';

function nowOdooFormat(): string {
  // Odoo espera UTC en formato "YYYY-MM-DD HH:mm:ss"
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
}

// ─── Iniciar actividad ────────────────────────────────────────────
export async function iniciarActividad(actividadId: number, parteId: number, uid: number): Promise<void> {
  const hora_inicio = nowOdooFormat();

  // Escribir hora_inicio en jornada.actividad y asignar al usuario si no está
  await callKw('jornada.actividad', 'write', [[actividadId], { 
    hora_inicio,
    equipo_ids: [[4, uid]] // 4 = LINK (añadir a la relación si no existe)
  }]);

  // Si el parte está en estado no_iniciado → ponerlo en_curso
  await callKw('jornada.proyecto', 'write', [[parteId], { state: 'en_curso' }]);
}

// ─── Pausar actividad ─────────────────────────────────────────────
export async function pausarActividad(actividadId: number): Promise<void> {
  const hora_fin = nowOdooFormat();
  
  // 1. Finalizar la actual (solo ponemos hora_fin, no movemos etapa de tarea)
  await callKw('jornada.actividad', 'write', [[actividadId], { hora_fin }]);

  // 2. Leer datos para clonar
  const actData: any[] = await callKw('jornada.actividad', 'read', [[actividadId]], {
    fields: ['name', 'proyecto_id', 'task_id', 'equipo_ids']
  });

  if (actData[0]) {
    const original = actData[0];
    
    // 3. Crear nueva actividad idéntica pero sin fechas
    await callKw('jornada.actividad', 'create', [{
      name: original.name,
      proyecto_id: original.proyecto_id ? original.proyecto_id[0] : false,
      task_id: original.task_id ? original.task_id[0] : false,
      equipo_ids: original.equipo_ids ? [[6, 0, original.equipo_ids]] : []
    }]);
  }
}

// ─── Finalizar actividad ──────────────────────────────────────────
export async function finalizarActividad(actividadId: number, uid: number): Promise<void> {
  const hora_fin = nowOdooFormat();
  await callKw('jornada.actividad', 'write', [[actividadId], { 
    hora_fin,
    equipo_ids: [[4, uid]]
  }]);

  try {
    // 1. Obtener el task_id asociado a la actividad
    const actData: any[] = await callKw('jornada.actividad', 'search_read', [[
      ['id', '=', actividadId]
    ]], { fields: ['task_id'], limit: 1 });

    const taskId = actData[0]?.task_id?.[0];
    if (taskId) {
      // 2. Buscar la primera etapa definida como "cerrada" o "Plegada" (fold = true)
      // Generalmente la etapa Finalizado tiene fold=True o is_closed=True
      const stageData: any[] = await callKw('project.task.type', 'search_read', [[
        '|', ['is_closed', '=', true], ['fold', '=', true]
      ]], { fields: ['id'], limit: 1 });

      const finalStageId = stageData[0]?.id;
      if (finalStageId) {
        // 3. Mover la tarea a la etapa final
        await callKw('project.task', 'write', [[taskId], { stage_id: finalStageId }]);
      }
    }
  } catch (err) {
    console.log('Error intentando mover la etapa del Kanban de la tarea:', err);
    // No bloqueamos la finalización de jornada en caso de que project_task falle por permisos
  }
}
