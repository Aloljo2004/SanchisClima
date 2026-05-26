import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { callKw } from '../../services/odoo';
import { 
  getFacturaById, 
  getLineasFactura, 
  getFacturaMessages, 
  cleanHtml, 
  discoverFacturaModel,
  getFacturaAttachments,
  getAttachmentData,
  getLineasFacturaByMoveId,
  getRelatedProjectAndActivityIds,
  getRelatedSaleOrderIds,
  getLineasSaleOrder
} from '../../services/facturas';
import type { Factura, FacturaLine, FacturaMessage, FacturaAttachment } from '../../services/facturas';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import ErrorBanner from '../../components/ErrorBanner';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '../../store/authStore';

function InfoCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{String(value || '')}</Text>
    </View>
  );
}

function LineItem({ line }: { line: FacturaLine }) {
  const prodName = line.product_id && Array.isArray(line.product_id) ? line.product_id[1] : '';
  const desc = line.name || 'Sin descripción';

  return (
    <View style={styles.lineItem}>
      <View style={styles.lineHeader}>
        <Text style={styles.lineName} numberOfLines={3}>{desc}</Text>
      </View>
      <View style={styles.lineFooter}>
        <Text style={styles.lineProduct} numberOfLines={1}>{prodName || 'Producto'}</Text>
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyText}>
            {line.quantity} {String(line.product_uom_id ? line.product_uom_id[1] : '')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function formatDate(dateStr?: string | false | null) {
  if (!dateStr) return 'N/A';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es });
  } catch {
    return String(dateStr);
  }
}

function InlineImage({ attachment }: { attachment: FacturaAttachment }) {
  const [base64, setBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const data = await getAttachmentData(attachment.id);
        if (active) setBase64(data);
      } catch (e) {
        console.warn('Error loading inline image:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchImage();
    return () => {
      active = false;
    };
  }, [attachment.id]);

  if (loading) {
    return (
      <View style={styles.inlineImagePlaceholder}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (!base64) {
    return null;
  }

  const imageMime = (attachment.mimetype && attachment.mimetype.startsWith('image/')) 
    ? attachment.mimetype 
    : 'image/jpeg';

  return (
    <Image 
      source={{ uri: `data:${imageMime};base64,${base64}` }} 
      style={styles.inlineImage} 
      resizeMode="cover"
    />
  );
}

function AttachmentItem({ 
  att, 
  onDownload 
}: { 
  att: FacturaAttachment; 
  onDownload: (att: FacturaAttachment) => void 
}) {
  const isImage = !!((att.mimetype && att.mimetype.startsWith('image/')) || (att.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name)));
  const icon = isImage ? '🖼️' : '📄';

  return (
    <TouchableOpacity 
      style={styles.attachmentButton} 
      onPress={() => onDownload(att)}
      activeOpacity={0.7}
    >
      <View style={{ width: '100%' }}>
        <View style={styles.attachmentContent}>
          <Text style={styles.attachmentIcon}>{icon}</Text>
          <Text style={styles.attachmentName} numberOfLines={1} ellipsizeMode="tail">
            {att.name}
          </Text>
          <Text style={styles.attachmentDownloadText}>Descargar</Text>
        </View>
        {isImage && (
          <View style={styles.inlineImageContainer}>
            <InlineImage attachment={att} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function MessageItem({ 
  msg, 
  attachments, 
  onDownload 
}: { 
  msg: FacturaMessage; 
  attachments: FacturaAttachment[]; 
  onDownload: (att: FacturaAttachment) => void 
}) {
  return (
    <View style={styles.messageItem}>
      <View style={styles.messageHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          <Text style={styles.messageAuthor}>{msg.author_id ? msg.author_id[1] : 'Sistema'}</Text>
          {msg.origin && (
            <View style={{ backgroundColor: Colors.surfaceElevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: Colors.border }}>
              <Text style={{ fontSize: 9, color: Colors.textSecondary, fontWeight: '700' }}>{msg.origin.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.messageDate}>{format(parseISO(msg.date.replace(' ', 'T') + 'Z'), 'dd MMM HH:mm', { locale: es })}</Text>
      </View>
      {msg.body ? <Text style={styles.messageBody}>{String(msg.body)}</Text> : null}
      
      {attachments.length > 0 && (
        <View style={styles.messageAttachmentsContainer}>
          <Text style={styles.attachmentsTitle}>Archivos adjuntos:</Text>
          {attachments.map((att) => (
            <AttachmentItem key={att.id} att={att} onDownload={onDownload} />
          ))}
        </View>
      )}
    </View>
  );
}

type Tab = 'detalle' | 'productos' | 'chatter';

export default function FacturaDetailScreen() {
  const { id, name: facturaName } = useLocalSearchParams<{ id: string; name?: string }>();
  const factId = Number(id);
  const [factura, setFactura] = useState<Factura | null>(null);
  const [lines, setLines] = useState<FacturaLine[]>([]);
  const [messages, setMessages] = useState<FacturaMessage[]>([]);
  const [attachments, setAttachments] = useState<FacturaAttachment[]>([]);
  const [facturaModel, setFacturaModel] = useState('account.move');
  const [activeTab, setActiveTab] = useState<Tab>('detalle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessRestricted, setAccessRestricted] = useState(false);

  const handleDownloadAttachment = async (attachment: FacturaAttachment) => {
    try {
      const base64Data = await getAttachmentData(attachment.id);
      
      const safeFilename = attachment.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const localUri = `${FileSystem.cacheDirectory}${safeFilename}`;
      
      await FileSystem.writeAsStringAsync(localUri, base64Data, {
        encoding: 'base64',
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: attachment.mimetype,
          dialogTitle: `Abrir/Guardar ${attachment.name}`,
        });
      } else {
        Alert.alert('Guardado', `El archivo se ha guardado localmente en cache: ${safeFilename}`);
      }
    } catch (err: any) {
      console.error('Error al descargar adjunto:', err);
      Alert.alert('Error', `No se pudo descargar el archivo: ${err.message || String(err)}`);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setAccessRestricted(false);
      if (isNaN(factId)) {
        throw new Error(`El ID de factura "${id}" no es un número válido.`);
      }

      // Descubrir modelo real (account.move, account.invoice, etc.)
      const model = await discoverFacturaModel();
      setFacturaModel(model);

      let f: Factura | null = null;
      try {
        f = await getFacturaById(factId, model);
      } catch (accessErr: any) {
        // Si falla por permisos, construir factura mínima con los datos del parámetro
        console.warn('Acceso restringido a factura:', accessErr.message);
        setAccessRestricted(true);
        f = {
          id: factId,
          name: facturaName ? decodeURIComponent(facturaName) : `Factura #${factId}`,
          partner_id: [0, ''],
          invoice_date: '',
          invoice_date_due: '',
          state: 'posted',
          invoice_origin: '',
          invoice_line_ids: [],
          narration: '',
          ref: ''
        };
      }

      setFactura(f);

      // 1. Obtener proyectos y actividades asociados a la factura
      const { proyectoIds, actividadIds } = await getRelatedProjectAndActivityIds(factId);

      // 2. Obtener pedidos de venta asociados (sale.order)
      const saleOrderIds = await getRelatedSaleOrderIds(f ? f.invoice_origin : null);


      let l: FacturaLine[] = [];
      let m: FacturaMessage[] = [];
      let atts: FacturaAttachment[] = [];

      if (f && !accessRestricted && f.invoice_line_ids && f.invoice_line_ids.length > 0) {
        try {
          l = await getLineasFactura(f.invoice_line_ids);
        } catch (lineErr: any) {
          console.warn('Error cargando líneas por IDs:', lineErr);
        }
      }

      if (l.length === 0) {
        try {
          l = await getLineasFacturaByMoveId(factId, model);
        } catch (lineErr: any) {
          console.warn('Error cargando líneas por move_id:', lineErr);
        }
      }

      if (l.length === 0 && saleOrderIds.length > 0) {
        try {
          l = await getLineasSaleOrder(saleOrderIds);
        } catch (lineErr: any) {
          console.warn('Error cargando líneas por sale.order:', lineErr);
        }
      }

      try {
        m = await getFacturaMessages(factId, model, proyectoIds, actividadIds, saleOrderIds);
      } catch (msgErr: any) {
        console.warn('Error cargando mensajes:', msgErr);
      }

      const msgAttIds: number[] = [];
      m.forEach(msg => {
        if (msg.attachment_ids && msg.attachment_ids.length > 0) {
          msgAttIds.push(...msg.attachment_ids);
        }
      });

      try {
        atts = await getFacturaAttachments(
          factId, 
          model, 
          msgAttIds, 
          proyectoIds, 
          actividadIds, 
          saleOrderIds
        );
      } catch (attErr: any) {
        console.warn('Error cargando adjuntos:', attErr);
      }

      setLines(l);
      setMessages(m);
      setAttachments(atts);
    } catch (e: any) {
      console.error('FacturaDetailScreen - Error:', e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Cargando factura...</Text>
      </View>
    );
  }

  if (error && !factura) {
    return <ErrorBanner message={error} onRetry={loadData} />;
  }

  if (!factura) {
    return <ErrorBanner message={error || 'Error desconocido'} onRetry={loadData} />;
  }

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'draft': return { label: 'Borrador', bg: Colors.surfaceElevated, color: Colors.textMuted };
      case 'posted': return { label: 'Publicado', bg: Colors.success + '33', color: Colors.success };
      case 'cancel': return { label: 'Cancelado', bg: Colors.danger + '33', color: Colors.danger };
      default: return { label: state, bg: Colors.surfaceElevated, color: Colors.textSecondary };
    }
  };
  const badge = getStateLabel(factura.state);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: factura.name || 'Detalle de Factura' }} />
      
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'detalle' && styles.tabActive]} 
          onPress={() => setActiveTab('detalle')}
        >
          <Text style={[styles.tabText, activeTab === 'detalle' && styles.tabTextActive]}>Info</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'productos' && styles.tabActive]} 
          onPress={() => setActiveTab('productos')}
        >
          <Text style={[styles.tabText, activeTab === 'productos' && styles.tabTextActive]}>Líneas ({lines.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'chatter' && styles.tabActive]} 
          onPress={() => setActiveTab('chatter')}
        >
          <Text style={[styles.tabText, activeTab === 'chatter' && styles.tabTextActive]}>Mensajes ({messages.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'detalle' && accessRestricted && (
          <View style={styles.restrictedBanner}>
            <Text style={styles.restrictedIcon}>🔒</Text>
            <Text style={styles.restrictedTitle}>Acceso restringido</Text>
            <Text style={styles.restrictedText}>
              Tu usuario no tiene permisos para ver el detalle de cabecera de esta factura en Odoo (problema de multi-compañía).
            </Text>
            <Text style={styles.restrictedText}>
              Puedes ver los productos, cantidades y mensajes en las pestañas superiores.
            </Text>
            <View style={styles.restrictedInfoCard}>
              <Text style={styles.restrictedLabel}>Referencia</Text>
              <Text style={styles.restrictedValue}>{factura.name}</Text>
            </View>
          </View>
        )}

        {activeTab === 'detalle' && !accessRestricted && (
          <>
            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <Text style={styles.invoiceId}>#{factura.id}</Text>
            </View>

            <InfoCard 
              label="Cliente" 
              value={factura.partner_id ? String(factura.partner_id[1]) : 'Sin cliente'} 
              icon="🏢" 
            />

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <InfoCard label="Fecha" value={formatDate(factura.invoice_date)} icon="📅" />
              </View>
              <View style={{ flex: 1 }}>
                <InfoCard label="Vencimiento" value={formatDate(factura.invoice_date_due)} icon="⌛" />
              </View>
            </View>

            {factura.ref && (
              <InfoCard label="Referencia" value={String(factura.ref)} icon="🆔" />
            )}

            {factura.invoice_origin && (
              <InfoCard label="Origen" value={String(factura.invoice_origin)} icon="🔗" />
            )}

            {(() => {
              const cleanedNarration = cleanHtml(factura.narration);
              return cleanedNarration ? (
                <View style={styles.termsSection}>
                  <Text style={styles.sectionTitle}>Términos y condiciones</Text>
                  <View style={styles.termsCard}>
                    <Text style={styles.termsText}>{cleanedNarration}</Text>
                  </View>
                </View>
              ) : null;
            })()}
          </>
        )}

        {activeTab === 'productos' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Líneas de Factura</Text>
            </View>
            {lines.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay líneas de producto</Text>
              </View>
            ) : (
              lines.map((line) => <LineItem key={line.id} line={line} />)
            )}
          </>
        )}

        {activeTab === 'chatter' && (
          <>
            {(() => {
              const allMessageAttachmentIds = new Set(messages.flatMap(msg => msg.attachment_ids || []));
              const generalAtts = attachments.filter(att => !allMessageAttachmentIds.has(att.id));
              return generalAtts.length > 0 ? (
                <View style={styles.generalAttachmentsContainer}>
                  <Text style={styles.generalAttachmentsTitle}>Archivos Adjuntos de la Factura</Text>
                  <View style={styles.generalAttachmentsList}>
                    {generalAtts.map((att) => (
                      <AttachmentItem 
                        key={att.id} 
                        att={att} 
                        onDownload={handleDownloadAttachment} 
                      />
                    ))}
                  </View>
                </View>
              ) : null;
            })()}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historial de Mensajes</Text>
            </View>
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay mensajes registrados</Text>
              </View>
            ) : (
              messages.map((msg) => {
                const msgAtts = attachments.filter(att => msg.attachment_ids && msg.attachment_ids.includes(att.id));
                return (
                  <MessageItem 
                    key={msg.id} 
                    msg={msg} 
                    attachments={msgAtts} 
                    onDownload={handleDownloadAttachment} 
                  />
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: Typography.sizes.md },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },

  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: Spacing.lg 
  },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  badgeText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  invoiceId: { color: Colors.textMuted, fontSize: Typography.sizes.sm },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  infoIcon: { fontSize: 16 },
  infoLabel: { color: Colors.textMuted, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  infoValue: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold },

  dateRow: { flexDirection: 'row', gap: Spacing.md },

  termsSection: { marginTop: Spacing.md },
  termsCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  termsText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, lineHeight: 20 },

  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Spacing.md, 
    gap: Spacing.sm 
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  countBadge: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full,
    minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  countText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },

  lineItem: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lineHeader: { marginBottom: Spacing.xs },
  lineName: { color: Colors.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  lineFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  lineProduct: { color: Colors.textMuted, fontSize: Typography.sizes.sm, flex: 1, marginRight: Spacing.sm },
  qtyBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  qtyText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },

  messageItem: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  messageAuthor: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  messageDate: { fontSize: 10, color: Colors.textMuted },
  messageBody: { color: Colors.textSecondary, fontSize: Typography.sizes.sm },

  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderStyle: 'dashed',
  },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  restrictedBanner: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  restrictedIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  restrictedTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  restrictedText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  restrictedInfoCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  restrictedLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  restrictedValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attachmentIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  attachmentName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  attachmentDownloadText: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  messageAttachmentsContainer: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  attachmentsTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  generalAttachmentsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  generalAttachmentsTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  generalAttachmentsList: {
    gap: Spacing.xs,
  },
  attachmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inlineImageContainer: {
    width: '100%',
    marginTop: Spacing.sm,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  inlineImagePlaceholder: {
    height: 120,
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  inlineImage: {
    height: 120,
    width: '100%',
    borderRadius: Radius.sm,
  },
});
