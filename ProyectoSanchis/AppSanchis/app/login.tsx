import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import {
  saveCredentials, saveSession, isBiometricAvailable,
  authenticateWithBiometric, getSupportedBiometricType, getStoredCredentials,
} from '../services/auth';
import { authenticate } from '../services/odoo';
import { setSessionId } from '../services/odoo';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuthStore();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioType, setBioType] = useState<'face' | 'fingerprint' | 'none'>('none');

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBioAvailable(available);
      if (available) setBioType(await getSupportedBiometricType());
    })();
  }, []);

  const validate = () => {
    let ok = true;
    setLoginError(''); setPasswordError(''); setError('');
    if (!login.trim()) { setLoginError('El usuario es obligatorio'); ok = false; }
    if (!password) { setPasswordError('La contraseña es obligatoria'); ok = false; }
    return ok;
  };

  const doLogin = async (usr: string, pwd: string) => {
    const result = await authenticate(usr, pwd);
    // Persistir sesión
    setSessionId(result.sessionId);
    await saveCredentials(usr, pwd);
    await saveSession(result.uid, result.sessionId, result.fullName);
    setSession(result.uid, result.sessionId, usr, result.fullName);
    router.replace('/dashboard');
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await doLogin(login.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Error de conexión con Odoo');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setBioLoading(true);
    try {
      const success = await authenticateWithBiometric();
      if (!success) { setError('Autenticación biométrica cancelada'); return; }
      const creds = await getStoredCredentials();
      if (!creds) { setError('No hay credenciales guardadas. Inicia sesión primero con usuario y contraseña.'); return; }
      await doLogin(creds.username, creds.password);
    } catch (e: any) {
      setError(e.message || 'Error biométrico');
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo / header */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🔧</Text>
            </View>
            <Text style={styles.appName}>Partes de Trabajo</Text>
            <Text style={styles.appTagline}>Javier Sanchis Climas de Alzira</Text>
          </View>

          {/* Card formulario */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Iniciar sesión</Text>

            {/* Error general */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>⚠️ {error}</Text>
              </View>
            )}

            {/* Usuario */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Usuario Odoo</Text>
              <TextInput
                style={[styles.input, !!loginError && styles.inputError]}
                value={login}
                onChangeText={(v) => { setLogin(v); setLoginError(''); setError(''); }}
                placeholder="usuario@empresa.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              {!!loginError && <Text style={styles.fieldError}>{loginError}</Text>}
            </View>

            {/* Contraseña */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={[styles.input, !!passwordError && styles.inputError]}
                value={password}
                onChangeText={(v) => { setPassword(v); setPasswordError(''); setError(''); }}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
            </View>

            {/* Botón principal */}
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnPrimaryText}>Iniciar sesión</Text>
              }
            </TouchableOpacity>

            {/* Botón biometría */}
            {bioAvailable && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity
                  style={[styles.btnBio, bioLoading && styles.btnDisabled]}
                  onPress={handleBiometric}
                  disabled={bioLoading}
                  activeOpacity={0.8}
                >
                  {bioLoading
                    ? <ActivityIndicator color={Colors.primary} />
                    : <>
                        <Text style={styles.bioIcon}>
                          {bioType === 'face' ? '👤' : '👆'}
                        </Text>
                        <Text style={styles.btnBioText}>
                          {'Entrar con Huella Dactilar'}
                        </Text>
                      </>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Info servidor */}
          <View style={styles.serverInfo}>
            <Text style={styles.serverText}>🌐 odoopruebas.aleza.pro · bd: odoo</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center', minHeight: height * 0.9 },

  logoArea: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center', alignItems: 'center',
    ...Shadow.lg, marginBottom: Spacing.lg,
  },
  logoEmoji: { fontSize: 42 },
  appName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.extrabold,
    letterSpacing: -0.5,
  },
  appTagline: { color: Colors.textMuted, fontSize: Typography.sizes.sm, marginTop: 4, textAlign: 'center' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.lg,
  },

  errorBox: {
    backgroundColor: '#7f1d1d',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  errorBoxText: { color: '#fca5a5', fontSize: Typography.sizes.sm },

  fieldGroup: { marginBottom: Spacing.lg },
  label: {
    color: Colors.textSecondary, fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium, marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    color: Colors.textPrimary, fontSize: 16,
  },
  inputError: { borderColor: Colors.danger },
  fieldError: { color: Colors.danger, fontSize: Typography.sizes.xs, marginTop: 4 },

  btnPrimary: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.lg, alignItems: 'center',
    ...Shadow.lg, marginTop: Spacing.xs,
  },
  btnPrimaryText: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  btnDisabled: { opacity: 0.6 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, marginHorizontal: Spacing.md, fontSize: Typography.sizes.sm },

  btnBio: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  bioIcon: { fontSize: 20 },
  btnBioText: { color: Colors.primary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },

  serverInfo: { marginTop: Spacing.xl, alignItems: 'center' },
  serverText: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
});
