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
  lines?: FacturaLine[];
}

const FACTURA_FIELDS = [
  'id', 'name', 'partner_id', 'invoice_date', 
  'invoice_date_due', 'state', 'invoice_origin', 'invoice_line_ids',
  'narration', 'ref'
];

const LINEA_FIELDS = [
  'id', 'name', 'product_id', 'quantity', 'product_uom_id'
];

export async function getFacturaById(id: number): Promise<Factura | null> {
  const result: any[] = await callKw('account.move', 'search_read', [[
    ['id', '=', id]
  ]], { fields: FACTURA_FIELDS, limit: 1 });

  if (result.length === 0) return null;
  return result[0];
}

export async function getLineasFactura(lineIds: number[]): Promise<FacturaLine[]> {
  if (lineIds.length === 0) return [];
  
  const result: any[] = await callKw('account.move.line', 'search_read', [[
    ['id', 'in', lineIds],
    ['display_type', '=', 'product']
  ]], { fields: LINEA_FIELDS, limit: 500 });

  return result;
}

export async function getFacturaMessages(facturaId: number): Promise<FacturaMessage[]> {
  const result: any[] = await callKw('mail.message', 'search_read', [[
    ['res_id', '=', facturaId],
    ['model', '=', 'account.move'],
    ['message_type', 'in', ['comment', 'notification']]
  ]], { 
    fields: ['id', 'body', 'author_id', 'date'],
    order: 'date desc',
    limit: 50 
  });

  return result.map(msg => ({
    ...msg,
    // Limpiar HTML básico del body si es necesario
    body: msg.body.replace(/<[^>]*>?/gm, '')
  }));
}
