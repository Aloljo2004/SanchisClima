import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import {
  searchProductos, getAllMaterialesByActividad,
  addMaterial, deleteMaterial,
} from '../../../services/materiales';
import type { Material, Producto } from '../../../services/materiales';
import ErrorBanner from '../../../components/ErrorBanner';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

type Tab = 'usados' | 'aPedir';

// ─── Item: Materiales utilizados ──────────────────────────────────
function MaterialItemUsado({ item, onDelete }: { item: Material; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert('Eliminar material', `¿Eliminar "${item.product_id[1]}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => { setDeleting(true); await onDelete(); },
      },
    ]);
  };

  return (
    <View style={usadoStyles.row}>
      <View style={usadoStyles.info}>
        <Text style={usadoStyles.name} numberOfLines={1}>{item.product_id[1]}</Text>
        <Text style={usadoStyles.qty}>{item.cantidad} {item.uom_id[1]}</Text>
      </View>
      <TouchableOpacity onPress={handleDelete} style={usadoStyles.deleteBtn} disabled={deleting}>
        {deleting
          ? <ActivityIndicator color={Colors.danger} size="small" />
          : <Text style={usadoStyles.deleteIcon}>🗑</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const usadoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1,
    borderColor: Colors.border, ...Shadow.sm,
  },
  info: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
  qty: { color: Colors.textMuted, fontSize: Typography.sizes.sm, marginTop: 2 },
  deleteBtn: { padding: Spacing.sm },
  deleteIcon: { fontSize: 18 },
});

// ─── Item: Materiales a pedir ─────────────────────────────────────
function MaterialItemAPedir({ item, onDelete }: { item: Material; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert('Eliminar material', `¿Eliminar "${item.product_id[1]}" de la lista a pedir?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => { setDeleting(true); await onDelete(); },
      },
    ]);
  };

  return (
    <View style={pedirStyles.row}>
      <View style={pedirStyles.indicator} />
      <View style={pedirStyles.info}>
        <Text style={pedirStyles.name} numberOfLines={1}>{item.product_id[1]}</Text>
        <Text style={pedirStyles.qty}>{item.cantidad} {item.uom_id[1]}</Text>
      </View>
      <TouchableOpacity onPress={handleDelete} style={pedirStyles.deleteBtn} disabled={deleting}>
        {deleting
          ? <ActivityIndicator color={Colors.warning} size="small" />
          : <Text style={pedirStyles.deleteIcon}>🗑</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const pedirStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.warning + '18',
    borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1,
    borderColor: Colors.warning + '55', ...Shadow.sm,
  },
  indicator: {
    width: 4, alignSelf: 'stretch',
    backgroundColor: Colors.warning,
    borderRadius: 2, marginRight: Spacing.sm,
  },
  info: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
  qty: { color: Colors.warning, fontSize: Typography.sizes.sm, marginTop: 2, fontWeight: Typography.weights.semibold },
  deleteBtn: { padding: Spacing.sm },
  deleteIcon: { fontSize: 18 },
});

// ─── Pantalla principal ───────────────────────────────────────────
export default function MaterialesScreen() {
  const { id, estado } = useLocalSearchParams<{ id: string; estado?: string }>();
  const router = useRouter();
  const actividadId = Number(id);

  const [activeTab, setActiveTab] = useState<Tab>(estado === 'enCurso' ? 'aPedir' : 'usados');

  // Búsqueda — una por pestaña
  const [queryUsados, setQueryUsados] = useState('');
  const [queryPedir, setQueryPedir] = useState('');
  const [resultadosUsados, setResultadosUsados] = useState<Producto[]>([]);
  const [resultadosPedir, setResultadosPedir] = useState<Producto[]>([]);
  const [searchingUsados, setSearchingUsados] = useState(false);
  const [searchingPedir, setSearchingPedir] = useState(false);

  // Materiales guardados
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [materialesPedir, setMaterialesPedir] = useState<Material[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Modal cantidad
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [saving, setSaving] = useState(false);
  const [isForPedir, setIsForPedir] = useState(false);

  const [error, setError] = useState('');
  const debounceUsados = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debouncePedir = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Carga de datos ───────────────────────────────────────────────
  const loadMateriales = useCallback(async () => {
    try {
      setLoadingList(true);
      setError('');
      const { usados, aPedir } = await getAllMaterialesByActividad(actividadId);
      setMateriales(usados);
      setMaterialesPedir(aPedir);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingList(false);
    }
  }, [actividadId]);

  useEffect(() => { loadMateriales(); }, [loadMateriales]);

  // ── Debounce búsqueda pestaña Usados ────────────────────────────
  useEffect(() => {
    clearTimeout(debounceUsados.current);
    if (!queryUsados.trim()) { setResultadosUsados([]); return; }
    debounceUsados.current = setTimeout(async () => {
      setSearchingUsados(true);
      const r = await searchProductos(queryUsados);
      setResultadosUsados(r);
      setSearchingUsados(false);
    }, 300);
    return () => clearTimeout(debounceUsados.current);
  }, [queryUsados]);

  // ── Debounce búsqueda pestaña A Pedir ───────────────────────────
  useEffect(() => {
    clearTimeout(debouncePedir.current);
    if (!queryPedir.trim()) { setResultadosPedir([]); return; }
    debouncePedir.current = setTimeout(async () => {
      setSearchingPedir(true);
      const r = await searchProductos(queryPedir);
      setResultadosPedir(r);
      setSearchingPedir(false);
    }, 300);
    return () => clearTimeout(debouncePedir.current);
  }, [queryPedir]);

  // ── Abrir modal ──────────────────────────────────────────────────
  const openModal = (product: Producto, forPedir: boolean) => {
    setSelectedProduct(product);
    setCantidad('1');
    setIsForPedir(forPedir);
    setModalVisible(true);
    if (forPedir) { setQueryPedir(''); setResultadosPedir([]); }
    else { setQueryUsados(''); setResultadosUsados([]); }
  };

  // ── Guardar ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedProduct) return;
    const qty = parseFloat(cantidad.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Cantidad inválida', 'Introduce una cantidad mayor que 0');
      return;
    }
    setSaving(true);
    try {
      const nuevo = await addMaterial(actividadId, selectedProduct, qty, isForPedir);
      setModalVisible(false);
      // Actualizar la lista local correctamente sin recargar todo
      if (isForPedir) {
        setMaterialesPedir((prev) => [...prev, nuevo]);
      } else {
        setMateriales((prev) => [...prev, nuevo]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────
  const handleDelete = async (materialId: number, forPedir: boolean) => {
    await deleteMaterial(materialId, forPedir);
    if (forPedir) {
      setMaterialesPedir((prev) => prev.filter((m) => m.id !== materialId));
    } else {
      setMateriales((prev) => prev.filter((m) => m.id !== materialId));
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerLeft: estado === 'finalizada' ? () => null : undefined,
          headerRight: estado === 'finalizada' ? () => (
            <TouchableOpacity
              onPress={() => router.replace('/dashboard')}
              style={styles.headerBtnFinalizar}
              activeOpacity={0.7}
            >
              <Text style={styles.headerBtnFinalizarText}>Finalizar</Text>
            </TouchableOpacity>
          ) : undefined,
        }}
      />

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'usados' && styles.tabActive]}
          onPress={() => setActiveTab('usados')}
          activeOpacity={0.8}
        >
          <Text style={styles.tabEmoji}>🔩</Text>
          <Text style={[styles.tabLabel, activeTab === 'usados' && styles.tabLabelActive]}>
            Utilizados
          </Text>
          <View style={[styles.tabBadge, activeTab === 'usados' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'usados' && styles.tabBadgeTextActive]}>
              {materiales.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'aPedir' && styles.tabActivePedir]}
          onPress={() => setActiveTab('aPedir')}
          activeOpacity={0.8}
        >
          <Text style={styles.tabEmoji}>🛒</Text>
          <Text style={[styles.tabLabel, activeTab === 'aPedir' && styles.tabLabelActivePedir]}>
            Restantes
          </Text>
          <View style={[styles.tabBadge, activeTab === 'aPedir' && styles.tabBadgeActivePedir]}>
            <Text style={[styles.tabBadgeText, activeTab === 'aPedir' && styles.tabBadgeTextActivePedir]}>
              {materialesPedir.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {!!error && <ErrorBanner message={error} onRetry={loadMateriales} />}

      {/* ── Contenido pestaña Utilizados ─────────────────────── */}
      {activeTab === 'usados' && (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={queryUsados}
              onChangeText={setQueryUsados}
              placeholder="Buscar y añadir producto…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
            />
            {searchingUsados && <ActivityIndicator color={Colors.primary} size="small" />}
            {queryUsados.length > 0 && !searchingUsados && (
              <TouchableOpacity onPress={() => setQueryUsados('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {resultadosUsados.length > 0 && (
            <View style={styles.dropdown}>
              {resultadosUsados.map((p: Producto) => (
                <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => openModal(p, false)}>
                  <Text style={styles.dropdownName}>{p.name}</Text>
                  <Text style={styles.dropdownUom}>{p.uom_id[1]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {loadingList ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
          ) : materiales.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔩</Text>
              <Text style={styles.emptyTitle}>Sin materiales utilizados</Text>
              <Text style={styles.emptySubtitle}>Busca un producto arriba para añadirlo</Text>
            </View>
          ) : (
            materiales.map((m: Material) => (
              <MaterialItemUsado key={m.id} item={m} onDelete={() => handleDelete(m.id, false)} />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Contenido pestaña A Pedir ────────────────────────── */}
      {activeTab === 'aPedir' && (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.searchContainer, styles.searchContainerPedir]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={queryPedir}
              onChangeText={setQueryPedir}
              placeholder="Buscar y añadir producto…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
            />
            {searchingPedir && <ActivityIndicator color={Colors.warning} size="small" />}
            {queryPedir.length > 0 && !searchingPedir && (
              <TouchableOpacity onPress={() => setQueryPedir('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {resultadosPedir.length > 0 && (
            <View style={styles.dropdown}>
              {resultadosPedir.map((p: Producto) => (
                <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => openModal(p, true)}>
                  <Text style={styles.dropdownName}>{p.name}</Text>
                  <Text style={styles.dropdownUom}>{p.uom_id[1]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {loadingList ? (
            <ActivityIndicator color={Colors.warning} style={{ marginTop: 24 }} />
          ) : materialesPedir.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyTitle}>Sin materiales restantes</Text>
              <Text style={styles.emptySubtitle}>Busca un producto arriba para añadirlo a la lista</Text>
            </View>
          ) : (
            materialesPedir.map((m: Material) => (
              <MaterialItemAPedir key={m.id} item={m} onDelete={() => handleDelete(m.id, true)} />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Modal cantidad ───────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isForPedir && styles.modalCardPedir]}>
            <Text style={styles.modalTitle}>
              {isForPedir ? '🛒 Añadir restantes' : '🔩 Añadir material utilizado'}
            </Text>
            <Text style={styles.modalProduct}>{selectedProduct?.name}</Text>
            <Text style={styles.modalUom}>Unidad: {selectedProduct?.uom_id[1]}</Text>

            <Text style={styles.modalLabel}>Cantidad</Text>
            <TextInput
              style={[styles.modalInput, isForPedir && styles.modalInputPedir]}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, isForPedir && styles.modalConfirmPedir, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },

  // ── Tabs ──────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabActivePedir: {
    borderBottomColor: Colors.warning,
  },
  tabEmoji: { fontSize: 16 },
  tabLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  tabLabelActivePedir: {
    color: Colors.warning,
    fontWeight: Typography.weights.bold,
  },
  tabBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    minWidth: 22, height: 22,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: { backgroundColor: Colors.primary },
  tabBadgeActivePedir: { backgroundColor: Colors.warning },
  tabBadgeText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  tabBadgeTextActive: { color: '#fff' },
  tabBadgeTextActivePedir: { color: '#fff' },

  // ── Búsqueda ──────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  searchContainerPedir: {
    borderColor: Colors.warning + '80',
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: Colors.textPrimary, paddingVertical: Spacing.md, fontSize: 16 },
  clearBtn: { color: Colors.textMuted, fontSize: 16, padding: 4 },

  // ── Dropdown ──────────────────────────────────────────────────────
  dropdown: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dropdownName: { color: Colors.textPrimary, fontSize: Typography.sizes.md, flex: 1 },
  dropdownUom: { color: Colors.textMuted, fontSize: Typography.sizes.sm },

  // ── Empty state ───────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center', paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // ── Modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalCardPedir: {
    borderTopColor: Colors.warning + '80',
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  modalProduct: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.medium,
  },
  modalUom: { color: Colors.textMuted, fontSize: Typography.sizes.sm, marginBottom: Spacing.lg },
  modalLabel: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, marginBottom: Spacing.xs },
  modalInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 24, fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xl, textAlign: 'center',
  },
  modalInputPedir: {
    borderColor: Colors.warning + '80',
  },
  modalActions: { flexDirection: 'row', gap: Spacing.md },
  modalCancel: {
    flex: 1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalCancelText: { color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  modalConfirm: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalConfirmPedir: {
    backgroundColor: Colors.warning,
  },
  modalConfirmText: { color: '#fff', fontWeight: Typography.weights.bold },
  
  headerBtnFinalizar: {
    backgroundColor: Colors.danger,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
  },
  headerBtnFinalizarText: {
    color: '#fff',
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.md,
  },
});
