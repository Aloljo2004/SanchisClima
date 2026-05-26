import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, BORDER_RADIUS } from '../theme/theme';
import { AppContext } from '../context/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];
const MESES_ABR = [
  'jan', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

// Helper to map month names in Spanish to abr (specifically for "mayo" -> "may", "junio" -> "jun", "julio" -> "jul", etc.)
const MESES_ABR_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

export default function HistoricoScreen() {
  const { fichajes } = useContext(AppContext);
  
  // Set default view to May 2026 (since mock data and local time metadata is centered around May 2026)
  const [selectedMonth, setSelectedMonth] = useState(4); // 0-indexed: 4 = Mayo
  const [selectedYear, setSelectedYear] = useState(2026);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Filter logs for the selected month and year
  const filteredFichajes = fichajes.filter((item) => {
    const parts = item.fecha.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Convert 1-indexed to 0-indexed
    return year === selectedYear && month === selectedMonth;
  });

  // Sort logs by timestamp descending (newest first)
  const sortedFichajes = [...filteredFichajes].sort((a, b) => b.timestamp - a.timestamp);

  // Group by date
  const groups = {};
  sortedFichajes.forEach((item) => {
    if (!groups[item.fecha]) {
      groups[item.fecha] = [];
    }
    groups[item.fecha].push(item);
  });

  // Convert groups into list structure
  const groupedData = Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map((fecha) => ({
      fecha,
      data: groups[fecha],
    }));

  const formatDateHeader = (dateStr) => {
    try {
      const parts = dateStr.split('-');
      const year = parts[0];
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      
      // Creating a date object in local timezone
      const date = new Date(year, month, day);
      const dayName = DIAS_SEMANA[date.getDay()];
      const monthName = MESES_ABR_ES[month];
      
      return `${dayName}, ${day} ${monthName} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const renderGroup = ({ item }) => {
    return (
      <View style={styles.groupContainer}>
        {/* Cabecera de fecha agrupada */}
        <View style={styles.groupHeader}>
          <Text style={styles.groupHeaderText}>{formatDateHeader(item.fecha)}</Text>
        </View>

        {/* Fichajes de ese día */}
        {item.data.map((log) => {
          const isEntrada = log.tipo.toLowerCase() === 'entrada';
          return (
            <View
              key={log.id}
              style={[
                styles.logRow,
                isEntrada ? styles.entradaRow : styles.salidaRow,
              ]}
            >
              {/* Borde de acento izquierdo */}
              <View
                style={[
                  styles.logAccentBorder,
                  isEntrada ? styles.entradaAccent : styles.salidaAccent,
                ]}
              />

              <View style={styles.logContent}>
                {/* Tipo de fichaje */}
                <Text style={styles.logTipoText}>{log.tipo}</Text>

                {/* Fecha */}
                <Text style={styles.logFechaText}>{log.fecha}</Text>

                {/* Hora (en negrita) */}
                <Text style={styles.logHoraText}>{log.hora}</Text>
              </View>

              {/* Icono de GPS si fue fichado con GPS */}
              {log.gps && (
                <Ionicons
                  name="pin"
                  size={16}
                  color={COLORS.teal}
                  style={styles.gpsIndicator}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Título de la pantalla */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico de Fichajes</Text>
      </View>

      {/* Navegador mensual */}
      <View style={styles.monthNavigator}>
        <TouchableOpacity
          style={styles.arrowButton}
          activeOpacity={0.7}
          onPress={handlePrevMonth}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.grayDark} />
        </TouchableOpacity>

        <Text style={styles.monthLabel}>
          {MESES[selectedMonth]} de {selectedYear}
        </Text>

        <TouchableOpacity
          style={styles.arrowButton}
          activeOpacity={0.7}
          onPress={handleNextMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={COLORS.grayDark} />
        </TouchableOpacity>
      </View>

      {/* Listado agrupado */}
      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.fecha}
        renderItem={renderGroup}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.grayMedium} />
            <Text style={styles.emptyText}>No hay fichajes en este mes</Text>
          </View>
        }
      />
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
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.grayLightest,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  monthLabel: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.grayDark,
    textTransform: 'lowercase',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupHeader: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.small,
    marginBottom: 10,
  },
  groupHeaderText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.primary,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.card,
    height: 60,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.grayLightest,
    ...SHADOWS.soft,
  },
  entradaRow: {
    backgroundColor: COLORS.entradaBg,
  },
  salidaRow: {
    backgroundColor: COLORS.salidaBg,
  },
  logAccentBorder: {
    width: 5,
    height: '100%',
  },
  entradaAccent: {
    backgroundColor: COLORS.entradaAccent,
  },
  salidaAccent: {
    backgroundColor: COLORS.salidaAccent,
  },
  logContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  logTipoText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.grayDark,
    width: 70,
  },
  logFechaText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.grayMedium,
  },
  logHoraText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.grayDark,
  },
  gpsIndicator: {
    marginRight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.grayMedium,
    marginTop: 12,
  },
});
