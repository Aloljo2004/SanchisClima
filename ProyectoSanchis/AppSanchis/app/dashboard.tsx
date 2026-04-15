import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { clearSession } from '../services/auth';
import { setSessionId } from '../services/odoo';
import {
  getActividadesHoy, getMisActividades, getActividadesSinAsignar, getActividadesHistorico,
} from '../services/partes';
import type { ActividadEnriquecida } from '../services/partes';
import ActividadCard from '../components/ActividadCard';
import { ListSkeleton } from '../components/LoadingSkeleton';
import ErrorBanner from '../components/ErrorBanner';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { uid, userFullName, clearSession: clearStore } = useAuthStore();

  const [actividadesHoy, setActividadesHoy] = useState<ActividadEnriquecida[]>([]);
  const [misActividades, setMisActividades] = useState<ActividadEnriquecida[]>([]);
  const [sinAsignar, setSinAsignar] = useState<ActividadEnriquecida[]>([]);
  const [historico, setHistorico] = useState<ActividadEnriquecida[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoOffset, setHistoricoOffset] = useState(0);
  const [historicoHasMore, setHistoricoHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    try {
      setError('');
      const [hoy, mis, sin] = await Promise.all([
        getActividadesHoy(),
        getMisActividades(uid || 1),
        getActividadesSinAsignar(),
      ]);
      setActividadesHoy(hoy);
      setMisActividades(mis);
      setSinAsignar(sin);

      setHistoricoOffset(0);
      const hist = await getActividadesHistorico(0, 20);
      setHistorico(hist);
      setHistoricoHasMore(hist.length === 20);
    } catch (e: any) {
      if (e.message?.includes('Session') || e.message?.includes('session') || e.message?.includes('-32001')) {
        handleLogout(true);
        return;
      }
      setError(e.message || 'Error al cargar las actividades');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll();
    }, [loadAll])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const loadMoreHistorico = async () => {
    if (loadingHistorico || !historicoHasMore) return;
    setLoadingHistorico(true);
    try {
      const newOffset = historicoOffset + 20;
      const more = await getActividadesHistorico(newOffset, 20);
      setHistorico((prev) => [...prev, ...more]);
      setHistoricoOffset(newOffset);
      setHistoricoHasMore(more.length === 20);
    } catch (_) {}
    finally { setLoadingHistorico(false); }
  };

  const handlePressActividad = (actividad: ActividadEnriquecida) => {
    router.push(`/actividad/${actividad.id}`);
  };

  const handleLogout = async (expired = false) => {
    const doLogout = async () => {
      setSessionId(null);
      await clearSession();
      clearStore();
      router.replace('/login');
    };

    if (expired) {
      Alert.alert('Sesión expirada', 'Tu sesión de Odoo ha expirado. Inicia sesión de nuevo.', [
        { text: 'Aceptar', onPress: doLogout },
      ]);
      return;
    }

    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
    ]);
  };

  const renderSection = (title: string, emoji: string, data: ActividadEnriquecida[], extra?: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{data.length}</Text>
        </View>
      </View>
      {data.length === 0
        ? <Text style={styles.empty}>Sin actividades en esta sección</Text>
        : data.map((a) => (
            <ActividadCard key={a.id} actividad={a} onPress={() => handlePressActividad(a)} />
          ))
      }
      {extra}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Buenos días 👋</Text>
          <Text style={styles.headerName}>{userFullName || 'Usuario'}</Text>
        </View>
        <TouchableOpacity onPress={() => handleLogout(false)} style={styles.logoutBtn}>
          <Text style={styles.logoutIcon}>⏻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ width: 140, height: 18, backgroundColor: Colors.surfaceElevated, borderRadius: 6 }} />
              </View>
              <ListSkeleton count={2} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {!!error && <ErrorBanner message={error} onRetry={loadAll} />}

          {renderSection('Actividades de hoy', '📅', actividadesHoy)}
          {renderSection('Mis actividades', '👷', misActividades)}
          {renderSection('Actividades sin asignar', '📭', sinAsignar)}
          {renderSection(
            'Actividades finalizadas', '📋', historico,
            historicoHasMore && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={loadMoreHistorico}
                disabled={loadingHistorico}
              >
                {loadingHistorico
                  ? <ActivityIndicator color={Colors.primary} />
                  : <Text style={styles.loadMoreText}>Cargar más</Text>
                }
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  headerGreeting: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  headerName: { color: Colors.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  logoutIcon: { fontSize: 18 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  section: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, flex: 1 },
  countBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: {
    color: Colors.textMuted, fontSize: Typography.sizes.sm, textAlign: 'center',
    paddingVertical: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, borderStyle: 'dashed',
  },
  loadMoreBtn: {
    borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  loadMoreText: { color: Colors.primary, fontWeight: Typography.weights.semibold },
});
