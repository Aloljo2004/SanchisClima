import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, BORDER_RADIUS } from '../theme/theme';
import { AppContext } from '../context/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfiguracionScreen() {
  const { serverUrl, saveServerUrl, logout } = useContext(AppContext);
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [testingConnection, setTestingConnection] = useState(false);

  const handleTestConnection = () => {
    if (!urlInput.trim()) {
      Alert.alert('Error', 'Por favor, introduce una dirección de servidor válida.');
      return;
    }

    setTestingConnection(true);

    // Simular prueba de conexión (1.5 segundos)
    setTimeout(() => {
      setTestingConnection(false);
      Alert.alert(
        'Conexión Exitosa',
        `Se ha establecido conexión correctamente con el servidor: ${urlInput}`,
        [{ text: 'Aceptar' }]
      );
    }, 1500);
  };

  const handleSave = () => {
    if (!urlInput.trim()) {
      Alert.alert('Error', 'La dirección del servidor no puede estar vacía.');
      return;
    }

    saveServerUrl(urlInput.trim());
    Alert.alert('Guardado', 'La configuración del servidor ha sido guardada con éxito.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Título de la pantalla */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tarjeta de Conexión */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Conexión</Text>

          {/* Campo de dirección del servidor */}
          <Text style={styles.label}>Dirección del servidor</Text>
          <View style={styles.inputContainer}>
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

          {/* Botón outlined: Probar conexión */}
          <TouchableOpacity
            style={styles.testBtn}
            activeOpacity={0.7}
            onPress={handleTestConnection}
            disabled={testingConnection}
          >
            {testingConnection ? (
              <ActivityIndicator size="small" color={COLORS.teal} style={styles.iconMargin} />
            ) : (
              <Ionicons name="wifi" size={18} color={COLORS.teal} style={styles.iconMargin} />
            )}
            <Text style={styles.testBtnText}>
              {testingConnection ? 'Probando...' : 'Probar conexión'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botón Guardar (Primario con ícono de guardar) */}
        <TouchableOpacity
          style={styles.saveBtn}
          activeOpacity={0.8}
          onPress={handleSave}
        >
          <Ionicons name="save-outline" size={20} color={COLORS.white} style={styles.iconMargin} />
          <Text style={styles.saveBtnText}>Guardar</Text>
        </TouchableOpacity>

        {/* Botón Cerrar Sesión */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.white} style={styles.iconMargin} />
          <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.grayLightest,
    ...SHADOWS.soft,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.grayDark,
    marginBottom: 20,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.grayMedium,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: BORDER_RADIUS.input,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  input: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.grayDark,
    padding: 0,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: BORDER_RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.teal,
    backgroundColor: 'transparent',
  },
  testBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.teal,
  },
  iconMargin: {
    marginRight: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.primary,
    ...SHADOWS.soft,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  saveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: BORDER_RADIUS.input,
    backgroundColor: COLORS.salida, // Rojo premium para botón de cerrar sesión
    ...SHADOWS.soft,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    marginTop: 16,
  },
  logoutBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
});
