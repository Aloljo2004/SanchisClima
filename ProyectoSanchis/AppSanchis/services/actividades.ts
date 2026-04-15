import { callKw } from './odoo';
import { format } from 'date-fns';

function nowOdooFormat(): string {
  // Odoo espera UTC en formato "YYYY-MM-DD HH:mm:ss"
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
}

// ─── Iniciar actividad ────────────────────────────────────────────
export async function iniciarActividad(actividadId: number, parteId: number): Promise<void> {
  const hora_inicio = nowOdooFormat();

  // Escribir hora_inicio en jornada.actividad
  await callKw('jornada.actividad', 'write', [[actividadId], { hora_inicio }]);

  // Si el parte está en estado no_iniciado → ponerlo en_curso
  await callKw('jornada.proyecto', 'write', [[parteId], { state: 'en_curso' }]);
}

// ─── Finalizar actividad ──────────────────────────────────────────
export async function finalizarActividad(actividadId: number): Promise<void> {
  const hora_fin = nowOdooFormat();
  await callKw('jornada.actividad', 'write', [[actividadId], { hora_fin }]);

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
