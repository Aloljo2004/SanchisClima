import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getFacturaById, getLineasFactura, getFacturaMessages } from '../../services/facturas';
import type { Factura, FacturaLine, FacturaMessage } from '../../services/facturas';
import ErrorBanner from '../../components/ErrorBanner';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
  return (
    <View style={styles.lineItem}>
      <View style={styles.lineHeader}>
        <Text style={styles.lineName} numberOfLines={2}>{String(line.name || 'Sin descripción')}</Text>
      </View>
      <View style={styles.lineFooter}>
        <Text style={styles.lineQty}>{line.quantity} {String(line.product_uom_id ? line.product_uom_id[1] : '')}</Text>
        <Text style={styles.lineProduct}>{String(line.product_id ? line.product_id[1] : '')}</Text>
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

function MessageItem({ msg }: { msg: FacturaMessage }) {
  return (
    <View style={styles.messageItem}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageAuthor}>{msg.author_id ? msg.author_id[1] : 'Sistema'}</Text>
        <Text style={styles.messageDate}>{format(parseISO(msg.date.replace(' ', 'T') + 'Z'), 'dd MMM HH:mm', { locale: es })}</Text>
      </View>
      <Text style={styles.messageBody}>{String(msg.body || '')}</Text>
    </View>
  );
}

type Tab = 'detalle' | 'productos' | 'chatter';

export default function FacturaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [lines, setLines] = useState<FacturaLine[]>([]);
  const [messages, setMessages] = useState<FacturaMessage[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('detalle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const f = await getFacturaById(Number(id));
      if (!f) throw new Error('No se encontró la factura');
      
      setFactura(f);
      
      const [l, m] = await Promise.all([
        f.invoice_line_ids && f.invoice_line_ids.length > 0 ? getLineasFactura(f.invoice_line_ids) : [],
        getFacturaMessages(f.id)
      ]);
      
      setLines(l);
      setMessages(m);
    } catch (e: any) {
      setError(e.message);
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

  if (error || !factura) {
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
        {activeTab === 'detalle' && (
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

            {factura.narration && (
              <View style={styles.termsSection}>
                <Text style={styles.sectionTitle}>Términos y condiciones</Text>
                <View style={styles.termsCard}>
                  <Text style={styles.termsText}>{String(factura.narration)}</Text>
                </View>
              </View>
            )}
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historial de Mensajes</Text>
            </View>
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay mensajes registrados</Text>
              </View>
            ) : (
              messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
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
  lineName: { color: Colors.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
  lineFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineQty: { color: Colors.primary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  lineProduct: { color: Colors.textMuted, fontSize: Typography.sizes.xs },

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
});
