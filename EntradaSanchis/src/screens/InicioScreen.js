import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, FONTS, SHADOWS, BORDER_RADIUS } from '../theme/theme';
import { AppContext } from '../context/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InicioScreen() {
  const {
    user,
    fichajes,
    addFichaje,
    gpsEnabled,
    setGpsEnabled,
  } = useContext(AppContext);

  const [selectedTipo, setSelectedTipo] = useState(null);
  const [motivoModalVisible, setMotivoModalVisible] = useState(false);
  const [registrando, setRegistrando] = useState(false);   // spinner mientras llama a Odoo
  const [resultadoVisible, setResultadoVisible] = useState(false);
  const [resultado, setResultado] = useState(null);        // { ok: bool, mensaje: string }

  // Estados de GPS
  const [coords, setCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Estados de Temporizador
  const [countdown, setCountdown] = useState(4);
  const countdownIntervalRef = useRef(null);

  // Último fichaje del historial
  const ultimoFichaje = fichajes[0] || null;

  const handlePress = (tipo) => {
    setSelectedTipo(tipo);
    setMotivoModalVisible(true);
  };

  /**
   * Obtiene la posición GPS si está habilitado.
   */
  const obtenerUbicacionGPS = async () => {
    if (!gpsEnabled) {
      setCoords(null);
      setLocationError(null);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    setCoords(null);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permiso de ubicación denegado.');
        setLocationLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (location && location.coords) {
        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setLocationError('No se pudo obtener la posición.');
      }
    } catch (error) {
      console.warn('Error al obtener ubicación GPS:', error);
      setLocationError('Error de GPS: ' + (error.message || error));
    } finally {
      setLocationLoading(false);
    }
  };

  // Efecto que controla el temporizador de 4 segundos y la obtención del GPS al abrir el modal
  useEffect(() => {
    if (motivoModalVisible) {
      // 1. Iniciar obtención de GPS
      obtenerUbicacionGPS();

      // 2. Iniciar temporizador de 4 segundos
      setCountdown(4);
      
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            
            // Llamada diferida para registrar automáticamente sin motivo
            setTimeout(() => {
              selectMotivo(null);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Limpiar al cerrar
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCoords(null);
      setLocationError(null);
      setLocationLoading(false);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [motivoModalVisible]);

  /**
   * Se llama al pulsar un número de motivo o automáticamente tras los 4s con num = null.
   * Cierra el modal de motivo, llama a Odoo y muestra resultado.
   */
  const selectMotivo = async (num) => {
    // Asegurar que limpiamos el temporizador
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setMotivoModalVisible(false);
    setRegistrando(true);

    try {
      await addFichaje(selectedTipo, num);

      // Éxito
      const esEntrada = selectedTipo === 'Entrada';
      const motivoStr = num ? ` (Motivo: ${num})` : ' (Sin motivo)';
      
      let mensajeGps = '';
      if (gpsEnabled && coords) {
        mensajeGps = `\n\n📍 Ubicación GPS:\nLat ${coords.latitude.toFixed(6)}, Lon ${coords.longitude.toFixed(6)}`;
      } else if (gpsEnabled && locationLoading) {
        mensajeGps = '\n\n📍 Ubicación GPS: Obteniendo posición...';
      } else if (gpsEnabled && locationError) {
        mensajeGps = `\n\n⚠️ Ubicación GPS no disponible: ${locationError}`;
      }

      setResultado({
        ok: true,
        tipo: selectedTipo,
        mensaje: (esEntrada
          ? `✅ Entrada registrada correctamente en Odoo${motivoStr}.`
          : `✅ Salida registrada correctamente en Odoo${motivoStr}.`) + mensajeGps,
      });
    } catch (e) {
      // Error
      setResultado({
        ok: false,
        tipo: selectedTipo,
        mensaje: e.message || 'Error desconocido al registrar en Odoo.',
      });
    } finally {
      setSelectedTipo(null);
      setRegistrando(false);
      setResultadoVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={true}>
        <View style={styles.content}>

          {/* Saludo y Logo */}
          <View style={styles.welcomeContainer}>
            <Image 
              source={require('../../assets/logo_jsc.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <Text style={styles.welcomeText}>¡Bienvenido!</Text>
            <Text style={styles.userName}>¡Hola {user?.nombre || 'Usuario'}!</Text>
            {user?.employeeId == null && (
              <View style={styles.warnBanner}>
                <Ionicons name="warning-outline" size={16} color="#92400E" style={{ marginRight: 6 }} />
                <Text style={styles.warnText}>
                  No se encontró tu ficha de empleado en Odoo.{'\n'}
                  Los fichajes no se guardarán hasta que el administrador vincule tu usuario.
                </Text>
              </View>
            )}
          </View>

          {/* Tarjeta de último fichaje */}
          <View style={[
            styles.lastLogCard,
            ultimoFichaje?.tipo === 'Entrada' && styles.lastLogCardEntrada,
            ultimoFichaje?.tipo === 'Salida' && styles.lastLogCardSalida,
          ]}>
            <View style={[
              styles.accentBorder,
              ultimoFichaje?.tipo === 'Entrada' ? styles.accentEntrada : styles.accentSalida,
            ]} />
            <View style={styles.lastLogContent}>
              <Text style={styles.lastLogTitle}>Último Fichaje:</Text>
              {ultimoFichaje ? (
                <Text style={styles.lastLogText}>
                  {ultimoFichaje.tipo} · {ultimoFichaje.fecha} · {ultimoFichaje.hora}
                </Text>
              ) : (
                <Text style={styles.lastLogText}>No hay registros recientes</Text>
              )}
            </View>
          </View>

          {/* Dos botones grandes lado a lado */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.entradaBtn, registrando && styles.btnDisabled]}
              activeOpacity={0.8}
              onPress={() => !registrando && handlePress('Entrada')}
            >
              <Ionicons name="log-in-outline" size={32} color={COLORS.white} style={{ marginBottom: 8 }} />
              <Text style={styles.actionBtnText}>INICIAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.salidaBtn, registrando && styles.btnDisabled]}
              activeOpacity={0.8}
              onPress={() => !registrando && handlePress('Salida')}
            >
              <Ionicons name="log-out-outline" size={32} color={COLORS.white} style={{ marginBottom: 8 }} />
              <Text style={styles.actionBtnText}>FINALIZAR</Text>
            </TouchableOpacity>
          </View>

          {/* Fichaje con GPS Toggle */}
          <View style={styles.gpsContainer}>
            <Text style={styles.gpsText}>Fichaje con GPS</Text>
            <Switch
              trackColor={{ false: COLORS.grayLight, true: COLORS.teal + '40' }}
              thumbColor={gpsEnabled ? COLORS.teal : COLORS.disabled}
              onValueChange={setGpsEnabled}
              value={gpsEnabled}
            />
          </View>


        </View>
      </ScrollView>

      {/* ── Modal: Selector de Motivo ───────────────────────────────────────── */}
      <Modal
        visible={motivoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMotivoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedTipo === 'Entrada' ? 'Registrar Entrada' : 'Registrar Salida'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Selecciona el motivo (1–10) para confirmar el fichaje o espera a que se registre de manera automática.
            </Text>

            {/* Temporizador Banner */}
            <View style={styles.timerBanner}>
              <Ionicons name="time-outline" size={16} color="#92400E" style={{ marginRight: 6 }} />
              <Text style={styles.timerText}>
                Auto-registro sin motivo en: <Text style={styles.timerSec}>{countdown}s</Text>
              </Text>
            </View>

            {/* GPS Banner */}
            {gpsEnabled && (
              <View style={[
                styles.gpsBanner,
                coords ? styles.gpsBannerSuccess : (locationError ? styles.gpsBannerError : styles.gpsBannerLoading)
              ]}>
                {locationLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#0891B2" style={{ marginRight: 8 }} />
                    <Text style={styles.gpsBannerText}>Obteniendo coordenadas GPS...</Text>
                  </>
                ) : coords ? (
                  <>
                    <Ionicons name="pin" size={16} color={COLORS.entrada} style={{ marginRight: 6 }} />
                    <Text style={[styles.gpsBannerText, { color: COLORS.entrada }]}>
                      Lat: {coords.latitude.toFixed(6)}, Lon: {coords.longitude.toFixed(6)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="warning-outline" size={16} color={COLORS.salida} style={{ marginRight: 6 }} />
                    <Text style={styles.gpsBannerTextError}>
                      {locationError || 'No se pudo obtener GPS'}
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* Grid 1-10 */}
            <View style={styles.gridContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.gridItem,
                    selectedTipo === 'Entrada' ? styles.gridItemEntrada : styles.gridItemSalida,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => selectMotivo(num)}
                >
                  <Text style={styles.gridItemText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              activeOpacity={0.7}
              onPress={() => { setMotivoModalVisible(false); setSelectedTipo(null); }}
            >
              <Text style={styles.modalCancelBtnText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Spinner de carga (enviando a Odoo) ───────────────────────── */}
      <Modal
        visible={registrando}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Conectando con Odoo…</Text>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Resultado del fichaje ────────────────────────────────────── */}
      <Modal
        visible={resultadoVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setResultadoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.resultBox,
            resultado?.ok ? styles.resultBoxOk : styles.resultBoxError,
          ]}>
            <Ionicons
              name={resultado?.ok ? 'checkmark-circle' : 'close-circle'}
              size={56}
              color={resultado?.ok ? COLORS.entrada : COLORS.salida}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.resultTitle}>
              {resultado?.ok ? '¡Fichaje registrado!' : 'Error al fichar'}
            </Text>
            <Text style={styles.resultMsg}>{resultado?.mensaje}</Text>

            <TouchableOpacity
              style={[styles.resultBtn, resultado?.ok ? styles.resultBtnOk : styles.resultBtnError]}
              activeOpacity={0.8}
              onPress={() => setResultadoVisible(false)}
            >
              <Text style={styles.resultBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
  },

  // ── Saludo ────────────────────────────────────────────────────────────────
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
    maxWidth: 340,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  welcomeText: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: COLORS.primary,
    textAlign: 'center',
  },
  userName: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    color: COLORS.grayMedium,
    marginTop: 8,
    textAlign: 'center',
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warnText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },

  // ── Último fichaje ────────────────────────────────────────────────────────
  lastLogCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    height: 80,
    overflow: 'hidden',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#334155',
    ...SHADOWS.soft,
  },
  lastLogCardEntrada: { borderColor: '#10B981' },
  lastLogCardSalida:  { borderColor: '#EF4444' },
  accentBorder: {
    width: 6,
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  accentEntrada: { backgroundColor: COLORS.entrada },
  accentSalida:  { backgroundColor: COLORS.salida },
  lastLogContent: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  lastLogTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primary,
    marginBottom: 4,
  },
  lastLogText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.grayDark,
  },

  // ── Botones INICIAR / FINALIZAR ───────────────────────────────────────────
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 340,
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  actionButton: {
    flex: 0.47,
    height: 140,
    borderRadius: BORDER_RADIUS.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  entradaBtn: { backgroundColor: COLORS.entrada },
  salidaBtn:  { backgroundColor: COLORS.salida },
  actionBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
    letterSpacing: 1,
  },

  // ── GPS ───────────────────────────────────────────────────────────────────
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.card,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.grayLightest,
    ...SHADOWS.soft,
  },
  gpsText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.grayDark,
  },



  // ── Modal overlay genérico ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // ── Modal selector de motivo ──────────────────────────────────────────────
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.grayDark,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.grayMedium,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  gridItem: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  gridItemEntrada: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  gridItemSalida: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  gridItemText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLightest,
  },
  modalCancelBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.grayMedium,
  },

  // ── Modal spinner (cargando) ──────────────────────────────────────────────
  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: 36,
    alignItems: 'center',
    width: 200,
    ...SHADOWS.medium,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.grayMedium,
    marginTop: 16,
    textAlign: 'center',
  },

  // ── Modal resultado ───────────────────────────────────────────────────────
  resultBox: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.medium,
  },
  resultBoxOk:    { borderTopWidth: 4, borderTopColor: COLORS.entrada },
  resultBoxError: { borderTopWidth: 4, borderTopColor: COLORS.salida },
  resultTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.grayDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultMsg: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.grayMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  resultBtn: {
    width: '100%',
    height: 48,
    borderRadius: BORDER_RADIUS.input,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBtnOk:    { backgroundColor: COLORS.entrada },
  resultBtnError: { backgroundColor: COLORS.salida },
  resultBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  timerText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#92400E',
  },
  timerSec: {
    fontFamily: FONTS.bold,
    color: '#B45309',
  },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  gpsBannerLoading: {
    backgroundColor: '#ECFEFF',
    borderColor: '#06B6D4',
  },
  gpsBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  gpsBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  gpsBannerText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.grayDark,
  },
  gpsBannerTextError: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#EF4444',
  },
});
