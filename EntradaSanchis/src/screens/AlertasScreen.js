import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, BORDER_RADIUS } from '../theme/theme';
import { AppContext } from '../context/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS_OF_WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function AlertasScreen() {
  const {
    alertas,
    addAlerta,
    editAlerta,
    deleteAlerta,
    toggleAlerta
  } = useContext(AppContext);

  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null); // null means creating
  const [alertTitle, setAlertTitle] = useState('');
  const [alertHour, setAlertHour] = useState(7);
  const [alertMinute, setAlertMinute] = useState(30);
  const [selectedDays, setSelectedDays] = useState(['L', 'M', 'X', 'J', 'V']);

  // Handle open modal for creating
  const handleOpenCreate = () => {
    setEditingId(null);
    setAlertTitle('Entrada');
    setAlertHour(7);
    setAlertMinute(30);
    setSelectedDays(['L', 'M', 'X', 'J', 'V']);
    setModalVisible(true);
  };

  // Handle open modal for editing
  const handleOpenEdit = (alerta) => {
    setEditingId(alerta.id);
    setAlertTitle(alerta.titulo);
    
    const [h, m] = alerta.hora.split(':').map(Number);
    setAlertHour(h);
    setAlertMinute(m);
    setSelectedDays([...alerta.dias]);
    setModalVisible(true);
  };

  // Handle save (create or edit)
  const handleSaveAlerta = () => {
    if (!alertTitle.trim()) {
      alert('Por favor, introduce un nombre para la alerta');
      return;
    }
    if (selectedDays.length === 0) {
      alert('Por favor, selecciona al menos un día de la semana');
      return;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const horaFormatted = `${pad(alertHour)}:${pad(alertMinute)}`;

    const newAlertaData = {
      titulo: alertTitle,
      hora: horaFormatted,
      dias: selectedDays,
    };

    if (editingId) {
      editAlerta(editingId, newAlertaData);
    } else {
      addAlerta(newAlertaData);
    }

    setModalVisible(false);
  };

  // Handle toggle day selection in modal
  const toggleDaySelection = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays((prev) => prev.filter((d) => d !== day));
    } else {
      setSelectedDays((prev) => [...prev, day]);
    }
  };

  // Increment/Decrement helper for custom time selector
  const adjustHour = (amount) => {
    setAlertHour((prev) => {
      let next = prev + amount;
      if (next > 23) return 0;
      if (next < 0) return 23;
      return next;
    });
  };

  const adjustMinute = (amount) => {
    setAlertMinute((prev) => {
      let next = prev + amount;
      if (next > 59) return 0;
      if (next < 0) return 59;
      return next;
    });
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      'Eliminar Alerta',
      `¿Estás seguro de que deseas eliminar la alerta "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteAlerta(id) },
      ]
    );
  };

  // Filter alerts by search query
  const filteredAlertas = alertas.filter((alerta) =>
    alerta.titulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Título superior */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alertas</Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.grayMedium} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título..."
            placeholderTextColor={COLORS.grayMedium}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.grayMedium} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sección Mis Alertas */}
        <Text style={styles.sectionTitle}>Mis alertas</Text>

        {filteredAlertas.map((item) => (
          <View key={item.id} style={styles.alertCard}>
            <View style={styles.cardInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.alertCardTitle}>{item.titulo}</Text>
                {item.isOdoo && (
                  <View style={styles.odooBadge}>
                    <Text style={styles.odooBadgeText}>ODOO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.alertCardMeta}>
                {item.hora} • {item.dias.join(', ')}
              </Text>
            </View>

            {/* Acciones de la tarjeta */}
            <View style={styles.cardActions}>
              {!item.isOdoo && (
                <TouchableOpacity
                  style={styles.editButton}
                  activeOpacity={0.7}
                  onPress={() => handleOpenEdit(item)}
                >
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
              )}

              <Switch
                trackColor={{ false: COLORS.grayLight, true: COLORS.teal + '40' }}
                thumbColor={item.activa ? COLORS.teal : COLORS.disabled}
                onValueChange={() => toggleAlerta(item.id)}
                value={item.activa}
                style={styles.alertSwitch}
              />

              <TouchableOpacity
                style={styles.deleteButton}
                activeOpacity={0.7}
                onPress={() => handleDelete(item.id, item.titulo)}
              >
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredAlertas.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={COLORS.grayMedium} />
            <Text style={styles.emptyText}>No se encontraron alertas</Text>
          </View>
        )}
      </ScrollView>

      {/* Botón flotante (+) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={handleOpenCreate}
      >
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>

      {/* Modal de Crear / Editar Alerta */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar Alerta' : 'Crear Alerta'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                {/* Nombre de la alerta */}
                <View style={styles.modalFieldContainer}>
                  <Text style={styles.modalLabel}>Nombre de la alerta</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej. Entrada, Salida, Almuerzo"
                    placeholderTextColor={COLORS.grayMedium}
                    value={alertTitle}
                    onChangeText={setAlertTitle}
                  />
                </View>

                {/* Reloj selector de hora (Toca para escribir o usa las flechas) */}
                <Text style={styles.modalLabel}>Seleccione la hora</Text>
                <View style={styles.clockContainer}>
                  {/* Selector de Horas */}
                  <View style={styles.clockColumn}>
                    <TouchableOpacity style={styles.clockArrow} onPress={() => adjustHour(1)}>
                      <Ionicons name="chevron-up" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.clockInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(alertHour).padStart(2, '0')}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (text === '') { setAlertHour(0); return; }
                        if (!isNaN(num) && num >= 0 && num <= 23) setAlertHour(num);
                      }}
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={styles.clockArrow} onPress={() => adjustHour(-1)}>
                      <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.clockSeparator}>:</Text>

                  {/* Selector de Minutos */}
                  <View style={styles.clockColumn}>
                    <TouchableOpacity style={styles.clockArrow} onPress={() => adjustMinute(1)}>
                      <Ionicons name="chevron-up" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.clockInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={String(alertMinute).padStart(2, '0')}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (text === '') { setAlertMinute(0); return; }
                        if (!isNaN(num) && num >= 0 && num <= 59) setAlertMinute(num);
                      }}
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={styles.clockArrow} onPress={() => adjustMinute(-1)}>
                      <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Selector de días de la semana como Toggles */}
                <Text style={styles.modalLabel}>Días de la semana</Text>
                <View style={styles.daysSelector}>
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayToggleBtn,
                          isSelected ? styles.dayToggleActive : styles.dayToggleInactive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => toggleDaySelection(day)}
                      >
                        <Text
                          style={[
                            styles.dayToggleText,
                            isSelected ? styles.dayToggleTextActive : styles.dayToggleTextInactive,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Botones de acción del Modal */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  activeOpacity={0.7}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  activeOpacity={0.7}
                  onPress={handleSaveAlerta}
                >
                  <Text style={styles.modalSaveText}>Guardar</Text>
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.primary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: BORDER_RADIUS.input,
    height: 48,
    paddingHorizontal: 12,
    ...SHADOWS.soft,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.grayDark,
    padding: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80, // Espacio para el FAB
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.grayDark,
    marginBottom: 12,
  },
  alertCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLightest,
    ...SHADOWS.soft,
  },
  cardInfo: {
    marginBottom: 12,
  },
  alertCardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.grayDark,
  },
  odooBadge: {
    backgroundColor: '#714B67', // Odoo purple color
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  odooBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  alertCardMeta: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.grayMedium,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLightest,
    paddingTop: 12,
  },
  editButton: {
    backgroundColor: COLORS.grayLightest,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: BORDER_RADIUS.small,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 16,
  },
  editButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.grayDark,
  },
  alertSwitch: {
    marginRight: 16,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.salidaAccent,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.grayMedium,
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    ...SHADOWS.medium,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.large,
    borderTopRightRadius: BORDER_RADIUS.large,
    padding: 24,
    maxHeight: '90%',
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.grayDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalFieldContainer: {
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.grayMedium,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: BORDER_RADIUS.input,
    height: 48,
    paddingHorizontal: 14,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.grayDark,
  },
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.grayLightest,
    borderRadius: BORDER_RADIUS.card,
    paddingVertical: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  clockColumn: {
    alignItems: 'center',
    width: 60,
  },
  clockArrow: {
    padding: 4,
  },
  clockInput: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: COLORS.primary,
    marginVertical: 4,
    textAlign: 'center',
    width: 60,
    padding: 0,
  },
  clockSeparator: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: COLORS.grayMedium,
    marginHorizontal: 12,
    paddingBottom: 4,
  },
  daysSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  dayToggleBtn: {
    width: '12.5%',
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayToggleActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  dayToggleInactive: {
    backgroundColor: COLORS.grayLightest,
    borderColor: COLORS.grayLight,
  },
  dayToggleText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  dayToggleTextActive: {
    color: COLORS.white,
  },
  dayToggleTextInactive: {
    color: COLORS.grayMedium,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingTop: 16,
  },
  modalCancelBtn: {
    flex: 0.47,
    height: 48,
    borderRadius: BORDER_RADIUS.input,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.grayLightest,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  modalCancelText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.grayMedium,
  },
  modalSaveBtn: {
    flex: 0.47,
    height: 48,
    borderRadius: BORDER_RADIUS.input,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    ...SHADOWS.soft,
  },
  modalSaveText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
});
