import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ActividadEnriquecida } from '../services/partes';

interface ActividadCardProps {
  actividad: ActividadEnriquecida;
  onPress: () => void;
}

export default function ActividadCard({ actividad, onPress }: ActividadCardProps) {
  
  const getActividadStatus = () => {
    if (actividad.hora_fin) {
      return { label: 'Finalizada', bg: Colors.success + '33', color: Colors.success, icon: '✅' };
    } else if (actividad.hora_inicio) {
      return { label: 'En curso', bg: Colors.warning + '33', color: Colors.warning, icon: '⏳' };
    }
    return { label: 'Pendiente', bg: Colors.surfaceElevated, color: Colors.textMuted, icon: '🔧' };
  };

  const status = getActividadStatus();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{actividad.name}</Text>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Referencia Parte */}
      <View style={styles.row}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.value} numberOfLines={1}>{actividad.parte_name}</Text>
      </View>

      {/* Cliente */}
      <View style={styles.row}>
        <Text style={styles.icon}>🏢</Text>
        <Text style={styles.value} numberOfLines={1}>
          {Array.isArray(actividad.cliente_id) ? actividad.cliente_id[1] : 'Sin cliente'}
        </Text>
      </View>

      {/* Factura si existe */}
      {actividad.factura_id && Array.isArray(actividad.factura_id) && (
        <View style={styles.row}>
          <Text style={styles.icon}>🧾</Text>
          <Text style={styles.value} numberOfLines={1}>{actividad.factura_id[1]}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.statusRow}>
          <Text style={styles.statusIcon}>{status.icon}</Text>
          <Text style={styles.footerText}>
            {actividad.hora_inicio && !actividad.hora_fin ? 'Trabajando actualmente...' : 
             actividad.hora_fin ? 'Trabajo completado' : 'Esperando inicio'}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  icon: {
    fontSize: 13,
    marginRight: Spacing.xs,
  },
  value: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIcon: { fontSize: 14 },
  footerText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  arrow: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: Typography.weights.bold,
  },
});
