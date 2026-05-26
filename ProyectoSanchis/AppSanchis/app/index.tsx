import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getStoredSession, saveSession } from '../services/auth';
import { setSessionId, setAllowedCompanyIds, fetchUserCompanyIds } from '../services/odoo';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/theme';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const { setSession, isAuthenticated } = useAuthStore();

  useEffect(() => {
    (async () => {
      try {
        const session = await getStoredSession();
        if (session) {
          // Restaurar session_id en el cliente axios para que todas las peticiones
          // incluyan la cookie de sesión de Odoo
          setSessionId(session.sessionId);
          
          let companyIds = session.companyIds || [];
          if (companyIds.length === 0) {
            companyIds = await fetchUserCompanyIds(session.uid);
            if (companyIds.length > 0) {
              await saveSession(session.uid, session.sessionId, session.fullName, companyIds);
            }
          }

          setAllowedCompanyIds(companyIds);
          setSession(
            session.uid, 
            session.sessionId, 
            session.username, 
            session.fullName, 
            companyIds
          );
        }
      } catch (_) {}
      finally { setChecking(false); }
    })();
  }, []);

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return isAuthenticated ? <Redirect href="/dashboard" /> : <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
