import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getActividadEnriquecidaById } from '../../services/partes';
import { iniciarActividad, finalizarActividad, pausarActividad } from '../../services/actividades';
import { useAuthStore } from '../../store/authStore';
import type { ActividadEnriquecida } from '../../services/partes';
import ErrorBanner from '../../components/ErrorBanner';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function InfoCard({ label, value, icon, highlight }: {
  label: string; value: string; icon: string; highlight?: string;
}) {
  return (
    <View style={[styles.infoCard, highlight && { borderColor: highlight, borderWidth: 1.5 }]}>
      <View style={styles.infoHeader}>
        <Text style={styles.infoIcon}>{icon}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, highlight && { color: highlight }]}>{value}</Text>
    </View>
  );
}

function formatDateTime(str?: string | false | null, fallback = 'Pendiente') {
  if (!str) return fallback;
  try {
    return format(parseISO(str.replace(' ', 'T')), "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  } catch { return String(str); }
}

export default function ActividadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { uid } = useAuthStore();

  const [actividad, setActividad] = useState<ActividadEnriquecida | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const a = await getActividadEnriquecidaById(Number(id));
      if (!a) throw new Error('Actividad no encontrada');
      setActividad(a);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleIniciar = async () => {
    if (!actividad) return;
    setActing(true);
    try {
      // Nota: getActividadEnriquecidaById devuelve parte_id como [id, nombre], así que si necesitamos el ID numérico
      const parteId = Array.isArray(actividad.parte_id) ? actividad.parte_id[0] : (actividad.parte_id as any);
      await iniciarActividad(actividad.id, parteId, uid || 0);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Error al iniciar la actividad');
    } finally {
      setActing(false);
    }
  };

  const handleFinalizar = async () => {
    if (!actividad) return;
    setActing(true);
    try {
      await finalizarActividad(actividad.id, uid || 0);
      router.replace(`/actividad/materiales/${actividad.id}?estado=finalizada`);
    } catch (e: any) {
      setError(e.message || 'Error al finalizar la actividad');
    } finally {
      setActing(false);
    }
  };
  
  const handlePausar = async () => {
    if (!actividad) return;
    setActing(true);
    try {
      await pausarActividad(actividad.id);
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Error al pausar la actividad');
    } finally {
      setActing(false);
    }
  };

  if (loading && !actividad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={styles.loadingText}>Cargando actividad…</Text>
      </View>
    );
  }

  if (!actividad) {
    return <ErrorBanner message={error || 'No se encontró la actividad'} />;
  }

  const finalizada = !!actividad.hora_fin;
  const enCurso = !!actividad.hora_inicio && !actividad.hora_fin;
  const pendiente = !actividad.hora_inicio;

  const getStatusBadge = () => {
    if (finalizada) return { label: 'Finalizada', bg: Colors.success + '33', color: Colors.success };
    if (enCurso) return { label: 'En curso', bg: Colors.warning + '33', color: Colors.warning };
    return { label: 'Pendiente', bg: Colors.surfaceElevated, color: Colors.textMuted };
  };
  const badge = getStatusBadge();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.stateRow}>
          <View style={[styles.stateBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.stateBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {!!error && <ErrorBanner message={error} />}

        <InfoCard label="Actividad" value={actividad.name} icon="🔧" />
        <InfoCard
          label="Cliente"
          value={actividad.cliente_id && actividad.cliente_id[1] ? actividad.cliente_id[1] : 'Sin cliente'}
          icon="🏢"
        />
        {actividad.factura_id && actividad.factura_id[1]
          ? <InfoCard label="Factura" value={actividad.factura_id[1]} icon="🧾" />
          : <InfoCard label="Factura" value="Sin factura asociada" icon="🧾" />
        }

        {/* Fechas: mostrar si ya están en curso o finalizadas */}
        {(enCurso || finalizada) && (
          <InfoCard
            label="Hora de inicio"
            value={formatDateTime(actividad.hora_inicio)}
            icon="🟢"
            highlight={Colors.success}
          />
        )}
        {finalizada && (
          <InfoCard
            label="Hora de finalización"
            value={formatDateTime(actividad.hora_fin)}
            icon="🔴"
            highlight={Colors.danger}
          />
        )}

        {/* Referencia original del parte */}
        <View style={styles.refCard}>
          <Text style={styles.refLabel}>Referencia origen</Text>
          <Text style={styles.refValue}>{actividad.parte_name}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {pendiente && (
          <View style={styles.enCursoContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnSuccess, acting && styles.btnOpaco, { flex: 2 }]}
              onPress={handleIniciar}
              disabled={acting}
              activeOpacity={0.85}
            >
              {acting
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Text style={styles.actionBtnIcon}>▶</Text>
                    <Text style={styles.actionBtnText}>Iniciar Actividad</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        {enCurso && (
          <View style={styles.enCursoContainer}>
            <TouchableOpacity
              style={styles.actionBtnMaterialesSecundario}
              onPress={() => router.push(`/actividad/materiales/${actividad.id}?estado=enCurso`)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnTextSecondary}>📦 Materiales Restantes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.btnSecondary, acting && styles.btnOpaco, { flex: 1 }]}
              onPress={handlePausar}
              disabled={acting}
              activeOpacity={0.85}
            >
              {acting 
                ? <ActivityIndicator color={Colors.textPrimary} size="small" />
                : <Text style={styles.actionBtnIcon}>⏸</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.btnWarning, acting && styles.btnOpaco, { flex: 1.5 }]}
              onPress={handleFinalizar}
              disabled={acting}
              activeOpacity={0.85}
            >
              {acting
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Text style={styles.actionBtnIcon}>⏹</Text>
                    <Text style={styles.actionBtnText}>Finalizar</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        {finalizada && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPrimary]}
            onPress={() => router.push(`/actividad/materiales/${actividad.id}?estado=finalizada`)}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnIcon}>📦</Text>
            <Text style={styles.actionBtnText}>Ver materiales asociados</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: Typography.sizes.md },
  scroll: { padding: Spacing.xl, paddingBottom: 140 },

  stateRow: { alignItems: 'flex-start', marginBottom: Spacing.lg },
  stateBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  stateBadgeText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },

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

  refCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refLabel: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  refValue: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl + 8, // Más espacio para evitar solapamiento con botones de Android
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  
  enCursoContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  
  actionBtn: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.md,
  },
  
  actionBtnMaterialesSecundario: {
    flex: 2,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  
  btnSuccess: { backgroundColor: Colors.success },
  btnWarning: { backgroundColor: Colors.warning },
  btnPrimary: { backgroundColor: Colors.primary },
  btnSecondary: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  btnOpaco: { opacity: 0.6 },
  
  actionBtnIcon: { color: '#fff', fontSize: 18 },
  actionBtnText: { color: '#fff', fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  actionBtnTextSecondary: { color: Colors.primary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
});
