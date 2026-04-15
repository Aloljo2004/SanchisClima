import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Modal, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  searchProductos, getMaterialesByActividad,
  addMaterial, deleteMaterial,
} from '../../../services/materiales';
import type { Material, Producto } from '../../../services/materiales';
import ErrorBanner from '../../../components/ErrorBanner';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

// ─── Componente de item material con efecto swipe-to-delete ──────
function MaterialItem({ item, onDelete }: { item: Material; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert('Eliminar material', `¿Eliminar "${item.product_id[1]}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          await onDelete();
        },
      },
    ]);
  };

  return (
    <View style={miStyles.row}>
      <View style={miStyles.info}>
        <Text style={miStyles.name} numberOfLines={1}>{item.product_id[1]}</Text>
        <Text style={miStyles.qty}>{item.cantidad} {item.uom_id[1]}</Text>
      </View>
      <TouchableOpacity onPress={handleDelete} style={miStyles.deleteBtn} disabled={deleting}>
        {deleting
          ? <ActivityIndicator color={Colors.danger} size="small" />
          : <Text style={miStyles.deleteIcon}>🗑</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const miStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  info: { flex: 1 },
  name: { color: Colors.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
  qty: { color: Colors.textMuted, fontSize: Typography.sizes.sm, marginTop: 2 },
  deleteBtn: { padding: Spacing.sm },
  deleteIcon: { fontSize: 18 },
});

// ─── Pantalla principal ───────────────────────────────────────────
export default function MaterialesScreen() {
  const { id, modo } = useLocalSearchParams<{ id: string; modo?: string }>();
  const actividadId = Number(id);
  const soloUsados = modo === 'enCurso';

  // Búsqueda
  const [query, setQuery] = useState('');
  const [queryPedir, setQueryPedir] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [resultadosPedir, setResultadosPedir] = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debounceRefPedir = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cargar listas al montar
  const loadMateriales = useCallback(async () => {
    try {
      setLoadingList(true);
      const [usados, pedir] = await Promise.all([
        getMaterialesByActividad(actividadId, false),
        getMaterialesByActividad(actividadId, true),
      ]);
      setMateriales(usados);
      setMaterialesPedir(pedir);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingList(false);
    }
  }, [actividadId]);

  useEffect(() => { loadMateriales(); }, [loadMateriales]);

  // Debounce búsqueda usados
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResultados([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchProductos(query);
      setResultados(r);
      setSearching(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Debounce búsqueda a pedir
  useEffect(() => {
    clearTimeout(debounceRefPedir.current);
    if (!queryPedir.trim()) { setResultadosPedir([]); return; }
    debounceRefPedir.current = setTimeout(async () => {
      setSearchingPedir(true);
      const r = await searchProductos(queryPedir);
      setResultadosPedir(r);
      setSearchingPedir(false);
    }, 300);
    return () => clearTimeout(debounceRefPedir.current);
  }, [queryPedir]);

  const openModal = (product: Producto, forPedir: boolean) => {
    setSelectedProduct(product);
    setCantidad('1');
    setIsForPedir(forPedir);
    setModalVisible(true);
    if (forPedir) { setQueryPedir(''); setResultadosPedir([]); }
    else { setQuery(''); setResultados([]); }
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    const qty = parseFloat(cantidad.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Cantidad inválida', 'Introduce una cantidad mayor que 0');
      return;
    }
    setSaving(true);
    try {
      await addMaterial(actividadId, selectedProduct, qty, isForPedir);
      setModalVisible(false);
      await loadMateriales();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (materialId: number, forPedir: boolean) => {
    await deleteMaterial(materialId);
    if (forPedir) {
      setMaterialesPedir((prev) => prev.filter((m) => m.id !== materialId));
    } else {
      setMateriales((prev) => prev.filter((m) => m.id !== materialId));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!!error && <ErrorBanner message={error} onRetry={loadMateriales} />}

        {/* --- Sección: Materiales utilizados --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔩</Text>
            <Text style={styles.sectionTitle}>Materiales utilizados</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{materiales.length}</Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { fontSize: 16 }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar producto…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator color={Colors.primary} size="small" />}
            {query.length > 0 && !searching && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {resultados.length > 0 && (
            <View style={styles.dropdown}>
              {resultados.map((p: Producto) => (
                <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => openModal(p, false)}>
                  <Text style={styles.dropdownName}>{p.name}</Text>
                  <Text style={styles.dropdownUom}>{p.uom_id[1]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {loadingList ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
          ) : materiales.length === 0 ? (
            <Text style={styles.emptyList}>Sin materiales añadidos</Text>
          ) : (
            materiales.map((m: Material) => (
              <MaterialItem key={m.id} item={m} onDelete={() => handleDelete(m.id, false)} />
            ))
          )}
        </View>

        {/* --- Sección: Materiales a pedir (solo si la actividad está finalizada) --- */}
        {!soloUsados && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>🛒</Text>
              <Text style={styles.sectionTitle}>Materiales a pedir</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{materialesPedir.length}</Text>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { fontSize: 16 }]}
                value={queryPedir}
                onChangeText={setQueryPedir}
                placeholder="Buscar producto…"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="search"
              />
              {searchingPedir && <ActivityIndicator color={Colors.primary} size="small" />}
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
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
            ) : materialesPedir.length === 0 ? (
              <Text style={styles.emptyList}>Sin materiales a pedir</Text>
            ) : (
              materialesPedir.map((m: Material) => (
                <MaterialItem key={m.id} item={m} onDelete={() => handleDelete(m.id, true)} />
              ))
            )}
          </View>
        )}

      </ScrollView>

      {/* Modal de cantidad */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isForPedir ? '🛒 Añadir a pedir' : '🔩 Añadir material'}
            </Text>
            <Text style={styles.modalProduct}>{selectedProduct?.name}</Text>
            <Text style={styles.modalUom}>Unidad: {selectedProduct?.uom_id[1]}</Text>

            <Text style={styles.modalLabel}>Cantidad</Text>
            <TextInput
              style={styles.modalInput}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, saving && { opacity: 0.6 }]}
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

  section: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, flex: 1 },
  countBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: Colors.textPrimary, paddingVertical: Spacing.md },
  clearBtn: { color: Colors.textMuted, fontSize: 16, padding: 4 },

  dropdown: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownName: { color: Colors.textPrimary, fontSize: Typography.sizes.md, flex: 1 },
  dropdownUom: { color: Colors.textMuted, fontSize: Typography.sizes.sm },

  emptyList: {
    color: Colors.textMuted, fontSize: Typography.sizes.sm, textAlign: 'center',
    paddingVertical: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, borderStyle: 'dashed',
  },

  // Modal
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
  modalTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, marginBottom: Spacing.sm },
  modalProduct: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.medium },
  modalUom: { color: Colors.textMuted, fontSize: Typography.sizes.sm, marginBottom: Spacing.lg },
  modalLabel: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, marginBottom: Spacing.xs },
  modalInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xl,
    textAlign: 'center',
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
  modalConfirmText: { color: '#fff', fontWeight: Typography.weights.bold },
});
