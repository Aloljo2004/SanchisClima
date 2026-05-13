import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import type { ActividadEnriquecida } from '../services/partes';

interface ActividadCardProps {
  actividad: ActividadEnriquecida;
  onPress: () => void;
  onIniciar?: (actividad: ActividadEnriquecida) => void;
  onPausar?: (actividad: ActividadEnriquecida) => void;
  onFinalizar?: (actividad: ActividadEnriquecida) => void;
  onMateriales?: (actividad: ActividadEnriquecida) => void;
  onFactura?: (facturaId: number) => void;
  isActing?: boolean;
}

export default function ActividadCard({ 
  actividad, 
  onPress, 
  onIniciar, 
  onPausar, 
  onFinalizar,
  onMateriales,
  onFactura,
  isActing 
}: ActividadCardProps) {
  
  const getActividadStatus = () => {
    if (actividad.hora_fin) {
      return { label: 'Finalizada', bg: Colors.success + '33', color: Colors.success, icon: '✅' };
    } else if (actividad.hora_inicio) {
      return { label: 'En curso', bg: Colors.warning + '33', color: Colors.warning, icon: '⏳' };
    }
    return { label: 'Pendiente', bg: Colors.surfaceElevated, color: Colors.textMuted, icon: '🔧' };
  };

  const status = getActividadStatus();
  const enCurso = !!actividad.hora_inicio && !actividad.hora_fin;
  const pendiente = !actividad.hora_inicio;
  const finalizada = !!actividad.hora_fin;
  const tieneFactura = actividad.factura_id && Array.isArray(actividad.factura_id) && actividad.factura_id[0];

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.infoContainer}>
        {/* ... (rest of info container) */}
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{actividad.name}</Text>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.icon}>📋</Text>
          <Text style={styles.value} numberOfLines={1}>{actividad.parte_name}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.icon}>🏢</Text>
          <Text style={styles.value} numberOfLines={1}>
            {Array.isArray(actividad.cliente_id) ? actividad.cliente_id[1] : 'Sin cliente'}
          </Text>
        </View>

        {actividad.factura_id && Array.isArray(actividad.factura_id) && (
          <View style={styles.row}>
            <Text style={styles.icon}>🧾</Text>
            <Text style={styles.value} numberOfLines={1}>{String(actividad.factura_id[1])}</Text>
          </View>
        )}

        <View style={styles.footerInfo}>
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

      {/* Action Buttons */}
      {(onIniciar || onPausar || onFinalizar || onMateriales) && (
        <View style={styles.actionRow}>
          {pendiente && onIniciar && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnSuccess]} 
              onPress={() => onIniciar(actividad)}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.btnIcon}>▶</Text>
                  <Text style={styles.btnText}>Iniciar</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {enCurso && (
            <>
              {onMateriales && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.btnSecondary, { flex: 1 }]} 
                  onPress={() => onMateriales(actividad)}
                  disabled={isActing}
                >
                  <Text style={[styles.btnIcon, { color: Colors.textPrimary }]}>📦</Text>
                  <Text style={[styles.btnText, { color: Colors.textPrimary }]}>Mat.</Text>
                </TouchableOpacity>
              )}
              {onPausar && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.btnSecondary, { flex: 1 }]} 
                  onPress={() => onPausar(actividad)}
                  disabled={isActing}
                >
                  {isActing ? (
                    <ActivityIndicator color={Colors.textPrimary} size="small" />
                  ) : (
                    <>
                      <Text style={[styles.btnIcon, { color: Colors.textPrimary }]}>⏸</Text>
                      <Text style={[styles.btnText, { color: Colors.textPrimary }]}>Pausar</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {onFinalizar && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.btnDanger, { flex: 1.5 }]} 
                  onPress={() => onFinalizar(actividad)}
                  disabled={isActing}
                >
                  {isActing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.btnIcon}>⏹</Text>
                      <Text style={styles.btnText}>Finalizar</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {finalizada && !pendiente && !enCurso && onMateriales && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.btnSecondary, { flex: 1 }]} 
              onPress={() => onMateriales(actividad)}
            >
              <Text style={[styles.btnIcon, { color: Colors.textPrimary }]}>📦</Text>
              <Text style={[styles.btnText, { color: Colors.textPrimary }]}>Ver materiales</Text>
            </TouchableOpacity>
          )}
        </View>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
    overflow: 'hidden',
  },
  infoContainer: {
    padding: Spacing.lg,
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
  footerInfo: {
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
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  btnSuccess: {
    flex: 1,
    backgroundColor: Colors.success,
  },
  btnDanger: {
    backgroundColor: Colors.danger,
  },
  btnSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnText: {
    color: '#fff',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  btnIcon: {
    color: '#fff',
    fontSize: 14,
  },
});

