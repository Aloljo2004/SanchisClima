import { callKw } from './odoo';

export interface FacturaLine {
  id: number;
  name: string;
  product_id: [number, string];
  quantity: number;
  product_uom_id: [number, string];
}

export interface FacturaMessage {
  id: number;
  body: string;
  author_id: [number, string] | false;
  date: string;
  attachment_ids?: number[];
  origin?: string;
}

export interface Factura {
  id: number;
  name: string;
  partner_id: [number, string];
  invoice_date: string | false;
  invoice_date_due: string | false;
  state: 'draft' | 'posted' | 'cancel';
  invoice_origin: string | false;
  invoice_line_ids: number[];
  narration: string | false; // Términos y condiciones
  ref: string | false; // Referencia de pago / Comunicación
  company_id?: [number, string] | false;
  lines?: FacturaLine[];
}

const FACTURA_FIELDS = [
  'id', 'name', 'partner_id', 'invoice_date', 
  'invoice_date_due', 'state', 'invoice_origin', 'invoice_line_ids',
  'narration', 'ref', 'company_id'
];

const LINEA_FIELDS = [
  'id', 'name', 'product_id', 'quantity', 'product_uom_id'
];

// Descubre a qué modelo Odoo apunta el campo factura_id de jornada.proyecto
export async function discoverFacturaModel(): Promise<string> {
  try {
    const fieldsInfo = await callKw('jornada.proyecto', 'fields_get', [['factura_id']], {});
    const relation = fieldsInfo?.factura_id?.relation;
    if (relation) return relation;
  } catch (e) {
    console.warn('No se pudo descubrir el modelo de factura_id:', e);
  }
  return 'account.move'; // fallback por defecto
}

export async function getFacturaById(id: number, model?: string): Promise<Factura | null> {
  const targetModel = model || 'account.move';
  const errors: string[] = [];

  // Intento 1: read con ID explícito
  try {
    const result: any[] = await callKw(targetModel, 'read', [[id]], { fields: FACTURA_FIELDS });
    if (result && result.length > 0) return result[0];
    errors.push(`${targetModel}.read: devolvió vacío`);
  } catch (e: any) {
    errors.push(`${targetModel}.read: ${e.message}`);
  }

  // Intento 2: search_read
  try {
    const result: any[] = await callKw(targetModel, 'search_read', [[
      ['id', '=', id]
    ]], { fields: FACTURA_FIELDS, limit: 1 });
    if (result && result.length > 0) return result[0];
    errors.push(`${targetModel}.search_read: devolvió vacío`);
  } catch (e: any) {
    errors.push(`${targetModel}.search_read: ${e.message}`);
  }

  // Si el modelo descubierto es distinto de account.move, probar también account.move
  if (targetModel !== 'account.move') {
    try {
      const result: any[] = await callKw('account.move', 'read', [[id]], { fields: FACTURA_FIELDS });
      if (result && result.length > 0) return result[0];
    } catch (e: any) {
      errors.push(`account.move.read: ${e.message}`);
    }
  }

  // Propagar errores para diagnóstico
  throw new Error(`Factura ID ${id} (modelo: ${targetModel}): ${errors.join(' | ')}`);
}

export async function getLineasFactura(lineIds: number[]): Promise<FacturaLine[]> {
  if (lineIds.length === 0) return [];
  
  try {
    // Usamos 'read' para evitar que ir.rules filtre líneas de factura
    const allLines: any[] = await callKw('account.move.line', 'read', [lineIds], { fields: LINEA_FIELDS });
    // Filtrar solo líneas de producto (display_type puede no estar en los campos leídos,
    // así que filtramos las que tienen product_id)
    return allLines.filter(l => l.product_id && l.product_id !== false);
  } catch (e: any) {
    console.warn('getLineasFactura - read falló, intentando search_read:', e.message);
    const result: any[] = await callKw('account.move.line', 'search_read', [[
      ['id', 'in', lineIds],
      ['display_type', '=', 'product']
    ]], { fields: LINEA_FIELDS, limit: 500 });
    return result;
  }
}

export async function getLineasFacturaByMoveId(moveId: number, model?: string): Promise<FacturaLine[]> {
  const targetModel = model || 'account.move';
  const fieldName = targetModel === 'account.invoice' ? 'invoice_id' : 'move_id';
  try {
    const result: any[] = await callKw('account.move.line', 'search_read', [[
      [fieldName, '=', moveId],
      ['display_type', '=', 'product']
    ]], { fields: LINEA_FIELDS, limit: 100 });
    return result;
  } catch (e: any) {
    console.warn(`getLineasFacturaByMoveId failed for ${fieldName} with display_type:`, e.message);
    try {
      const result: any[] = await callKw('account.move.line', 'search_read', [[
        [fieldName, '=', moveId]
      ]], { fields: LINEA_FIELDS, limit: 100 });
      return result.filter(l => l.product_id && l.product_id !== false);
    } catch (e2: any) {
      console.warn(`getLineasFacturaByMoveId backup failed for ${fieldName}:`, e2.message);
      return [];
    }
  }
}

export async function getLineasSaleOrder(saleOrderIds: number[]): Promise<FacturaLine[]> {
  if (!saleOrderIds || saleOrderIds.length === 0) return [];
  try {
    const saleOrders: any[] = await callKw('sale.order', 'read', [saleOrderIds], { fields: ['order_line'] });
    if (saleOrders && saleOrders.length > 0) {
      const lineIds = saleOrders.flatMap((so: any) => so.order_line || []);
      if (lineIds.length > 0) {
        const soLines: any[] = await callKw('sale.order.line', 'read', [lineIds], {
          fields: ['id', 'name', 'product_id', 'product_uom_qty', 'product_uom']
        });
        return soLines.map((l: any) => ({
          id: l.id,
          name: l.name || '',
          product_id: l.product_id || [0, ''],
          quantity: l.product_uom_qty || 0,
          product_uom_id: l.product_uom || [0, '']
        }));
      }
    }
  } catch (e) {
    console.warn('Error fetching sale order lines as fallback:', e);
  }
  return [];
}

export function cleanHtml(htmlStr?: string | false | null): string {
  if (!htmlStr) return '';
  return htmlStr
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

export async function getFacturaMessages(
  facturaId: number, 
  model?: string,
  proyectoIds: number[] = [],
  actividadIds: number[] = [],
  saleOrderIds: number[] = []
): Promise<FacturaMessage[]> {
  const targetModel = model || 'account.move';
  const queries: Promise<any[]>[] = [];

  // Query 1: Factura chatter
  queries.push(
    callKw('mail.message', 'search_read', [[
      ['res_id', '=', facturaId],
      ['model', '=', targetModel],
      ['message_type', 'in', ['comment', 'notification']]
    ]], { 
      fields: ['id', 'body', 'author_id', 'date', 'attachment_ids'],
      order: 'date desc',
      limit: 50 
    }).then(msgs => msgs.map((m: any) => ({ ...m, origin: 'Factura' }))).catch(err => {
      console.warn('Error cargando mensajes de factura:', err);
      return [];
    })
  );

  // Query 2: Proyecto chatter
  if (proyectoIds.length > 0) {
    queries.push(
      callKw('mail.message', 'search_read', [[
        ['res_id', 'in', proyectoIds],
        ['model', '=', 'jornada.proyecto'],
        ['message_type', 'in', ['comment', 'notification']]
      ]], {
        fields: ['id', 'body', 'author_id', 'date', 'attachment_ids'],
        order: 'date desc',
        limit: 50
      }).then(msgs => msgs.map((m: any) => ({ ...m, origin: 'Parte de Trabajo' }))).catch(err => {
        console.warn('Error cargando mensajes de jornada.proyecto:', err);
        return [];
      })
    );
  }

  // Query 3: Actividad chatter
  if (actividadIds.length > 0) {
    queries.push(
      callKw('mail.message', 'search_read', [[
        ['res_id', 'in', actividadIds],
        ['model', '=', 'jornada.actividad'],
        ['message_type', 'in', ['comment', 'notification']]
      ]], {
        fields: ['id', 'body', 'author_id', 'date', 'attachment_ids'],
        order: 'date desc',
        limit: 50
      }).then(msgs => msgs.map((m: any) => ({ ...m, origin: 'Actividad' }))).catch(err => {
        console.warn('Error cargando mensajes de jornada.actividad:', err);
        return [];
      })
    );
  }

  // Query 4: Pedidos de venta chatter
  if (saleOrderIds.length > 0) {
    queries.push(
      callKw('mail.message', 'search_read', [[
        ['res_id', 'in', saleOrderIds],
        ['model', '=', 'sale.order'],
        ['message_type', 'in', ['comment', 'notification']]
      ]], {
        fields: ['id', 'body', 'author_id', 'date', 'attachment_ids'],
        order: 'date desc',
        limit: 50
      }).then(msgs => msgs.map((m: any) => ({ ...m, origin: 'Pedido de Venta' }))).catch(err => {
        console.warn('Error cargando mensajes de sale.order:', err);
        return [];
      })
    );
  }

  const results = await Promise.all(queries);
  const allMessages = results.flat();

  // Ordenar por fecha desc
  allMessages.sort((a, b) => new Date(b.date.replace(' ', 'T')).getTime() - new Date(a.date.replace(' ', 'T')).getTime());

  return allMessages.map(msg => ({
    ...msg,
    body: cleanHtml(msg.body)
  }));
}

export interface FacturaAttachment {
  id: number;
  name: string;
  mimetype: string;
  message_id?: [number, string] | false;
}

export async function getFacturaAttachments(
  facturaId: number,
  model?: string,
  messageAttachmentIds?: number[],
  proyectoIds: number[] = [],
  actividadIds: number[] = [],
  saleOrderIds: number[] = [],
  onError?: (err: string) => void
): Promise<FacturaAttachment[]> {
  const targetModel = model || 'account.move';
  let attachments: FacturaAttachment[] = [];

  // 1. Adjuntos de Factura
  try {
    const res = await callKw('ir.attachment', 'search_read', [[
      ['res_model', '=', targetModel],
      ['res_id', '=', facturaId]
    ]], {
      fields: ['id', 'name', 'mimetype'],
      limit: 100
    });
    if (res && res.length > 0) {
      attachments = [...attachments, ...res];
    }
  } catch (e: any) {
    console.warn(`Error fetching direct attachments for ${targetModel}:`, e);
    if (onError) onError(`Factura (${targetModel}): ${e.message || e}`);
  }

  // 2. Adjuntos de Proyectos
  if (proyectoIds.length > 0) {
    try {
      const res = await callKw('ir.attachment', 'search_read', [[
        ['res_model', '=', 'jornada.proyecto'],
        ['res_id', 'in', proyectoIds]
      ]], {
        fields: ['id', 'name', 'mimetype'],
        limit: 100
      });
      if (res && res.length > 0) {
        attachments = [...attachments, ...res];
      }
    } catch (e: any) {
      console.warn('Error fetching attachments for jornada.proyecto:', e);
      if (onError) onError(`Proyecto: ${e.message || e}`);
    }
  }

  // 3. Adjuntos de Actividades
  if (actividadIds.length > 0) {
    try {
      const res = await callKw('ir.attachment', 'search_read', [[
        ['res_model', '=', 'jornada.actividad'],
        ['res_id', 'in', actividadIds]
      ]], {
        fields: ['id', 'name', 'mimetype'],
        limit: 100
      });
      if (res && res.length > 0) {
        attachments = [...attachments, ...res];
      }
    } catch (e: any) {
      console.warn('Error fetching attachments for jornada.actividad:', e);
      if (onError) onError(`Actividad: ${e.message || e}`);
    }
  }

  // 4. Adjuntos de Pedidos de Venta
  if (saleOrderIds.length > 0) {
    try {
      const res = await callKw('ir.attachment', 'search_read', [[
        ['res_model', '=', 'sale.order'],
        ['res_id', 'in', saleOrderIds]
      ]], {
        fields: ['id', 'name', 'mimetype'],
        limit: 100
      });
      if (res && res.length > 0) {
        attachments = [...attachments, ...res];
      }
    } catch (e: any) {
      console.warn('Error fetching attachments for sale.order:', e);
      if (onError) onError(`Pedido Venta: ${e.message || e}`);
    }
  }

  // 5. Fallback por IDs leídos directamente de los mensajes
  if (messageAttachmentIds && messageAttachmentIds.length > 0) {
    const existingIds = new Set(attachments.map(a => a.id));
    const missingIds = messageAttachmentIds.filter(id => !existingIds.has(id));
    if (missingIds.length > 0) {
      try {
        const extra: FacturaAttachment[] = await callKw('ir.attachment', 'read', [missingIds], {
          fields: ['id', 'name', 'mimetype']
        });
        if (extra && extra.length > 0) {
          attachments = [...attachments, ...extra];
        }
      } catch (extraErr: any) {
        console.warn('Error fetching extra attachments by ID:', extraErr);
        if (onError) onError(`Mensaje IDs: ${extraErr.message || extraErr}`);
      }
    }
  }

  // Eliminar duplicados
  const uniqueMap = new Map<number, FacturaAttachment>();
  attachments.forEach(att => uniqueMap.set(att.id, att));
  return Array.from(uniqueMap.values());
}

export async function getAttachmentData(attachmentId: number): Promise<string> {
  const result: any[] = await callKw('ir.attachment', 'read', [[attachmentId]], {
    fields: ['datas']
  });
  if (!result || result.length === 0) {
    throw new Error('No se encontró el contenido del archivo.');
  }
  return result[0].datas; // Base64
}

export async function getRelatedProjectAndActivityIds(facturaId: number): Promise<{ proyectoIds: number[], actividadIds: number[] }> {
  const proyectoIds: number[] = [];
  const actividadIds: number[] = [];
  try {
    const proyectos = await callKw('jornada.proyecto', 'search_read', [[
      ['factura_id', '=', facturaId]
    ]], { fields: ['id', 'actividad_ids'], limit: 50 });
    
    if (proyectos && proyectos.length > 0) {
      proyectos.forEach((p: any) => {
        proyectoIds.push(p.id);
        if (p.actividad_ids && Array.isArray(p.actividad_ids)) {
          actividadIds.push(...p.actividad_ids);
        }
      });
    }
  } catch (e) {
    console.warn('Error fetching related projects/activities:', e);
  }
  return { proyectoIds, actividadIds };
}

export async function getRelatedSaleOrderIds(invoiceOrigin: string | false | null): Promise<number[]> {
  if (!invoiceOrigin) return [];
  const origins = invoiceOrigin.split(',').map(s => s.trim()).filter(Boolean);
  if (origins.length === 0) return [];
  try {
    const soResult = await callKw('sale.order', 'search_read', [[
      ['name', 'in', origins]
    ]], { fields: ['id'], limit: 10 });
    if (soResult && soResult.length > 0) {
      return soResult.map((so: any) => so.id);
    }
  } catch (e) {
    console.warn('Error fetching related sale orders:', e);
  }
  return [];
}
