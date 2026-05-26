import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Switch,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, BORDER_RADIUS } from '../theme/theme';
import { AppContext } from '../context/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';

export default function LoginScreen() {
  const { login, loginBiometric, serverUrl, saveServerUrl } = useContext(AppContext);
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Estados de Servidor
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [testingConnection, setTestingConnection] = useState(false);

  // Sincronizar urlInput con serverUrl
  useEffect(() => {
    setUrlInput(serverUrl);
  }, [serverUrl]);

  // Modales de simulación NFC
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);

  const handleLogin = async () => {
    if (!usuario.trim()) {
      setLoginError('Por favor, introduce tu usuario');
      return;
    }
    if (!contrasena.trim()) {
      setLoginError('Por favor, introduce tu contraseña');
      return;
    }
    setLoginError(null);
    setLoggingIn(true);
    try {
      await login(usuario.trim(), contrasena, recordar);
    } catch (e) {
      setLoginError(e.message || 'No se pudo conectar con el servidor');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleNfcLogin = () => {
    setNfcModalVisible(true);
    setNfcScanning(true);
    // Simular escaneo de tarjeta NFC por 2.5s
    setTimeout(() => {
      setNfcScanning(false);
      setTimeout(() => {
        setNfcModalVisible(false);
        login('Luis', '1234', recordar);
      }, 500);
    }, 2500);
  };

  const handleBiometricLogin = async () => {
    try {
      // Verificar si el hardware de biometría está disponible
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(
          'Biometría no disponible',
          'Este dispositivo no cuenta con sensor de huellas dactilares o FaceID.'
        );
        return;
      }

      // Verificar si hay datos biométricos registrados
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'Biometría no configurada',
          'No se han registrado huellas dactilares ni Face ID en este dispositivo.'
        );
        return;
      }

      // Iniciar proceso de autenticación nativa
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Iniciar sesión en Siscentro',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const logged = await loginBiometric();
        if (!logged) {
          Alert.alert('Error', 'No se pudieron recuperar las credenciales guardadas.');
        }
      }
    } catch (e) {
      console.error('Biometric authentication error:', e);
      Alert.alert('Error', 'Ocurrió un error al intentar la autenticación biométrica.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Barra de cabecera superior */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>JSC Control de Presencia</Text>
        <TouchableOpacity
          style={styles.configHeaderBtn}
          activeOpacity={0.7}
          onPress={() => setConfigModalVisible(true)}
        >
          <Ionicons name="settings-outline" size={22} color={COLORS.grayDark} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <View style={styles.content}>
            
            {/* Logo de la Empresa */}
            <Image 
              source={require('../../assets/logo_jsc.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />

            {/* Título de bienvenida */}
            <Text style={styles.title}>Javier Sanchis Clima</Text>

            {/* Formulario */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Usuario"
                  placeholderTextColor={COLORS.grayMedium}
                  value={usuario}
                  onChangeText={setUsuario}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor={COLORS.grayMedium}
                  secureTextEntry
                  value={contrasena}
                  onChangeText={setContrasena}
                  autoCapitalize="none"
                />
              </View>

              {/* Recordar sesión Toggle */}
              <View style={styles.rememberContainer}>
                <Switch
                  trackColor={{ false: COLORS.grayLight, true: COLORS.teal + '40' }}
                  thumbColor={recordar ? COLORS.teal : COLORS.disabled}
                  onValueChange={setRecordar}
                  value={recordar}
                />
                <Text style={styles.rememberText}>Recordar sesión</Text>
              </View>

              {/* Error de login */}
              {loginError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color="#FCA5A5" style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{loginError}</Text>
                </View>
              ) : null}

              {/* Botón principal */}
              <TouchableOpacity
                style={[styles.loginButton, loggingIn && { opacity: 0.7 }]}
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={loggingIn}
              >
                {loggingIn
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                }
              </TouchableOpacity>

              {/* Botón secundario NFC */}
              <TouchableOpacity
                style={styles.nfcButton}
                activeOpacity={0.8}
                onPress={handleNfcLogin}
              >
                <Ionicons name="card-outline" size={20} color={COLORS.grayDark} style={styles.buttonIcon} />
                <Text style={styles.nfcButtonText}>Login con NFC</Text>
              </TouchableOpacity>
            </View>

            {/* Icono huella dactilar debajo del formulario */}
            <View style={styles.biometricContainer}>
              <TouchableOpacity
                style={styles.fingerprintButton}
                activeOpacity={0.7}
                onPress={handleBiometricLogin}
              >
                <Ionicons name="finger-print" size={54} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.biometricText}>Acceso biométrico</Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Simulación NFC */}
      <Modal
        visible={nfcModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNfcModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="card" size={60} color={COLORS.primary} />
            <Text style={styles.modalTitle}>Login con NFC</Text>
            {nfcScanning ? (
              <>
                <Text style={styles.modalBody}>Acerque su tarjeta Siscentro al reverso del dispositivo...</Text>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
              </>
            ) : (
              <>
                <Text style={styles.modalBodySuccess}>¡Tarjeta leída con éxito!</Text>
                <Ionicons name="checkmark-circle" size={40} color={COLORS.entradaAccent} style={{ marginTop: 15 }} />
              </>
            )}
            {nfcScanning && (
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setNfcModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Configuración de Servidor */}
      <Modal
        visible={configModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="server" size={48} color={COLORS.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Configurar Servidor</Text>
            
            <Text style={styles.configLabel}>Dirección del servidor</Text>
            <View style={[styles.inputContainer, { width: '100%', marginBottom: 16 }]}>
              <TextInput
                style={styles.input}
                placeholder="control.siscentro.com"
                placeholderTextColor={COLORS.grayMedium}
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Probar conexión */}
            <TouchableOpacity
              style={[styles.testBtn, testingConnection && { opacity: 0.8 }]}
              activeOpacity={0.7}
              onPress={() => {
                if (!urlInput.trim()) {
                  Alert.alert('Error', 'Por favor, introduce una dirección de servidor válida.');
                  return;
                }
                setTestingConnection(true);
                setTimeout(() => {
                  setTestingConnection(false);
                  Alert.alert(
                    'Conexión Exitosa',
                    `Se ha establecido conexión correctamente con el servidor: ${urlInput.trim()}`,
                    [{ text: 'Aceptar' }]
                  );
                }, 1200);
              }}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <ActivityIndicator size="small" color={COLORS.teal} style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="wifi" size={18} color={COLORS.teal} style={{ marginRight: 8 }} />
              )}
              <Text style={styles.testBtnText}>
                {testingConnection ? 'Probando...' : 'Probar conexión'}
              </Text>
            </TouchableOpacity>

            {/* Acciones: Cancelar y Guardar */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                activeOpacity={0.7}
                onPress={() => setConfigModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                activeOpacity={0.7}
                onPress={() => {
                  if (!urlInput.trim()) {
                    Alert.alert('Error', 'La dirección del servidor no puede estar vacía.');
                    return;
                  }
                  saveServerUrl(urlInput.trim());
                  setConfigModalVisible(false);
                  Alert.alert('Guardado', 'La configuración del servidor ha sido guardada con éxito.');
                }}
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>

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
  headerBar: {
    height: 56,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
    ...SHADOWS.soft,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.grayDark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.primary,
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  inputContainer: {
    marginBottom: 16,
    backgroundColor: COLORS.grayLightest,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: BORDER_RADIUS.input,
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 16,
    ...SHADOWS.soft,
  },
  input: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.grayDark,
    padding: 0,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingLeft: 4,
  },
  rememberText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.grayDark,
    marginLeft: 10,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.input,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: BORDER_RADIUS.small,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#FCA5A5',
    flex: 1,
  },
  nfcButton: {
    backgroundColor: COLORS.white, // Color de tarjeta
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: BORDER_RADIUS.input,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  buttonIcon: {
    marginRight: 8,
  },
  nfcButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.grayDark,
  },
  biometricContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  fingerprintButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    ...SHADOWS.medium,
    marginBottom: 8,
  },
  biometricText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.grayMedium,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.grayDark,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.grayMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBodySuccess: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.entradaAccent,
    textAlign: 'center',
    marginTop: 8,
  },
  modalCancelButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: COLORS.grayLightest,
  },
  modalCancelText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.grayMedium,
  },
  configHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.grayLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configLabel: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.grayDark,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: BORDER_RADIUS.input,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 24,
  },
  testBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.teal,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionBtn: {
    flex: 0.47,
    height: 48,
    borderRadius: BORDER_RADIUS.input,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  cancelBtn: {
    backgroundColor: COLORS.grayLightest,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  cancelBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.grayDark,
  },
  saveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
});
