import React, { useContext, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ActivityIndicator, View, Modal, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider, AppContext } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import useAlarmChecker from './src/hooks/useAlarmChecker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

function MainAppContent() {
  const { isLoggedIn, loading, alertas } = useContext(AppContext);
  const [triggeredAlarm, setTriggeredAlarm] = useState(null);

  const handleAlarmTriggered = useCallback((alerta) => {
    setTriggeredAlarm(alerta);
  }, []);

  // Run alarm checker while logged in
  useAlarmChecker(isLoggedIn ? alertas : [], handleAlarmTriggered);

  // Show loading indicator while retrieving session/data from storage
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />
      {isLoggedIn ? (
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      ) : (
        <LoginScreen />
      )}

      {/* ── Modal de Alerta In-App ─────────────────────────────────────────── */}
      <Modal
        visible={triggeredAlarm !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTriggeredAlarm(null)}
      >
        <View style={styles.alarmOverlay}>
          <View style={styles.alarmBox}>
            <Text style={styles.alarmIcon}>⏰</Text>
            <Text style={styles.alarmTitle}>{triggeredAlarm?.titulo}</Text>
            <Text style={styles.alarmTime}>{triggeredAlarm?.hora}</Text>
            <Text style={styles.alarmBody}>
              ¡Es hora de tu {triggeredAlarm?.titulo?.toLowerCase()}!
            </Text>
            <TouchableOpacity
              style={styles.alarmDismissBtn}
              activeOpacity={0.8}
              onPress={() => setTriggeredAlarm(null)}
            >
              <Text style={styles.alarmDismissText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  // Load Plus Jakarta Sans font weights
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Show loading spinner until fonts are loaded
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // ── Alarm Modal ──────────────────────────────────────────────────────────
  alarmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alarmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderTopWidth: 5,
    borderTopColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  alarmIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  alarmTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  alarmTime: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 36,
    color: '#1E3A8A',
    marginBottom: 8,
  },
  alarmBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  alarmDismissBtn: {
    backgroundColor: '#1E3A8A',
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmDismissText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
