import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import {
  getProductos, getAllMaterialesByActividad,
  addMaterial, deleteMaterial, updateMaterial
} from '../../../services/materiales';
import type { Material, Producto } from '../../../services/materiales';
import ErrorBanner from '../../../components/ErrorBanner';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

type Tab = 'usados' | 'aPedir';

// ─── Item del Catálogo ───────────────────────────────────────────
interface CatalogItemProps {
  producto: Producto;
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  loading?: boolean;
  color: string;
}

function CatalogItem({ producto, qty, onIncrement, onDecrement, loading, color }: CatalogItemProps) {
  return (
    <View style={[styles.itemCard, qty > 0 && { borderColor: color, borderWidth: 1.5 }]}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{producto.name}</Text>
        <Text style={styles.itemUom}>{producto.uom_id[1]}</Text>
      </View>
      
      <View style={styles.controls}>
        {qty > 0 && (
          <>
            <TouchableOpacity 
              onPress={onDecrement} 
              style={[styles.controlBtn, { borderColor: color }]}
              disabled={loading}
            >
              <Text style={[styles.controlText, { color }]}>−</Text>
            </TouchableOpacity>
            
            <View style={styles.qtyBadge}>
              {loading ? (
                <ActivityIndicator size="small" color={color} />
              ) : (
                <Text style={styles.qtyText}>{qty}</Text>
              )}
            </View>
          </>
        )}
        
        <TouchableOpacity 
          onPress={onIncrement} 
          style={[styles.controlBtn, { backgroundColor: color, borderColor: color }]}
          disabled={loading}
        >
          {loading && qty === 0 ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.controlText, { color: '#fff' }]}>+</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Pantalla Principal ──────────────────────────────────────────
export default function MaterialesScreen() {
  const { id, estado } = useLocalSearchParams<{ id: string; estado?: string }>();
  const router = useRouter();
  const actividadId = Number(id);

  const [activeTab, setActiveTab] = useState<Tab>(estado === 'enCurso' ? 'aPedir' : 'usados');
  const [query, setQuery] = useState('');
  
  // Datos
  const [catalog, setCatalog] = useState<Producto[]>([]);
  const [usados, setUsados] = useState<Material[]>([]);
  const [aPedir, setAPedir] = useState<Material[]>([]);
  
  // Estados de carga
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null); // productId
  const [error, setError] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Cargar Catálogo y Materiales ────────────────────────────────
  const loadData = useCallback(async (searchQuery: string = '') => {
    try {
      if (!searchQuery) setLoadingCatalog(true);
      const [prods, mats] = await Promise.all([
        getProductos(searchQuery),
        getAllMaterialesByActividad(actividadId)
      ]);
      setCatalog(prods);
      setUsados(mats.usados);
      setAPedir(mats.aPedir);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingCatalog(false);
      setLoadingInitial(false);
    }
  }, [actividadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Buscador con Debounce ───────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setLoadingCatalog(true);
      getProductos(query).then(prods => {
        setCatalog(prods);
        setLoadingCatalog(false);
      });
    }, 400);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // ── Lógica de Incremento/Decremento ──────────────────────────────
  const handleAction = async (producto: Producto, delta: number) => {
    setActingId(producto.id);
    const isForPedir = activeTab === 'aPedir';
    const currentList = isForPedir ? aPedir : usados;
    const existing = currentList.find(m => m.product_id[0] === producto.id);

    try {
      if (delta > 0) {
        if (existing) {
          await updateMaterial(existing.id, existing.cantidad + delta, isForPedir);
        } else {
          await addMaterial(actividadId, producto, delta, isForPedir);
        }
      } else {
        if (!existing) return;
        if (existing.cantidad + delta <= 0) {
          await deleteMaterial(existing.id, isForPedir);
        } else {
          await updateMaterial(existing.id, existing.cantidad + delta, isForPedir);
        }
      }
      // Recargar materiales para reflejar cambios
      const { usados: u, aPedir: p } = await getAllMaterialesByActividad(actividadId);
      setUsados(u);
      setAPedir(p);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActingId(null);
    }
  };

  // ── Preparar datos para la lista ────────────────────────────────
  const displayData = useMemo(() => {
    const currentList = activeTab === 'aPedir' ? aPedir : usados;
    return catalog.map(p => {
      const mat = currentList.find(m => m.product_id[0] === p.id);
      return {
        producto: p,
        qty: mat ? mat.cantidad : 0,
        isActing: actingId === p.id
      };
    });
  }, [catalog, usados, aPedir, activeTab, actingId]);

  if (loadingInitial) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const tabColor = activeTab === 'usados' ? Colors.primary : Colors.warning;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: 'Gestión de Materiales',
          headerLeft: () => null, // Ocultar flecha de atrás
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.headerBtnSalir}
              activeOpacity={0.7}
            >
              <Text style={styles.headerBtnSalirText}>Salir</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'usados' && { borderBottomColor: Colors.primary }]}
          onPress={() => setActiveTab('usados')}
        >
          <Text style={[styles.tabLabel, activeTab === 'usados' && { color: Colors.primary, fontWeight: '700' }]}>🔩 Utilizados</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'aPedir' && { borderBottomColor: Colors.warning }]}
          onPress={() => setActiveTab('aPedir')}
        >
          <Text style={[styles.tabLabel, activeTab === 'aPedir' && { color: Colors.warning, fontWeight: '700' }]}>🛒 Restantes</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Buscador */}
        <View style={styles.searchBox}>
          <Text style={styles.searchEmoji}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar material..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={Colors.textMuted}
          />
          {loadingCatalog && <ActivityIndicator size="small" color={tabColor} />}
          {query.length > 0 && !loadingCatalog && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!error && <ErrorBanner message={error} onRetry={loadData} />}

        <FlatList
          data={displayData}
          keyExtractor={(item) => item.producto.id.toString()}
          renderItem={({ item }) => (
            <CatalogItem 
              producto={item.producto}
              qty={item.qty}
              color={tabColor}
              loading={item.isActing}
              onIncrement={() => handleAction(item.producto, 1)}
              onDecrement={() => handleAction(item.producto, -1)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loadingCatalog ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No se encontraron materiales</Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: Typography.sizes.md, color: Colors.textMuted },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    height: 50,
  },
  searchEmoji: { marginRight: Spacing.sm, fontSize: 16 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 16 },
  clearText: { color: Colors.textMuted, fontSize: 18, padding: 4 },

  list: { paddingBottom: 100 },
  
  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  itemInfo: { flex: 1, marginRight: Spacing.md },
  itemName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, color: Colors.textPrimary },
  itemUom: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  controlBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  controlText: { fontSize: 20, fontWeight: 'bold' },
  
  qtyBadge: { minWidth: 30, alignItems: 'center' },
  qtyText: { fontSize: Typography.sizes.lg, fontWeight: 'bold', color: Colors.textPrimary },

  headerBtnSalir: {
    backgroundColor: Colors.danger,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
  },
  headerBtnSalirText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: Typography.sizes.sm,
  },
  
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted },
});
