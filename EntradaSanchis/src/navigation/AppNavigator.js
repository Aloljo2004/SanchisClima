import React, { useContext } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../theme/theme';
import { AppContext } from '../context/AppContext';

// Import screens
import InicioScreen from '../screens/InicioScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import AlertasScreen from '../screens/AlertasScreen';
import ConfiguracionScreen from '../screens/ConfiguracionScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { activeAlertsCount } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Histórico') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Alertas') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Configuración') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.grayMedium,
        tabBarStyle: {
          backgroundColor: COLORS.white, // Se traduce a Slate 800 en tema oscuro
          borderTopWidth: 1,
          borderTopColor: COLORS.grayLight, // Slate 600
          height: Platform.OS === 'ios'
            ? (60 + insets.bottom)
            : (insets.bottom > 0 ? 65 + insets.bottom : 82), // Ajustado y elevado considerablemente en Android
          paddingBottom: Platform.OS === 'ios'
            ? (insets.bottom > 0 ? insets.bottom - 4 : 12)
            : (insets.bottom > 0 ? insets.bottom + 6 : 24), // Elevado para evitar solapar con botones físicos o virtuales de Android
          paddingTop: 8,
          position: 'absolute', // Permite que se dibuje correctamente
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.medium,
          fontSize: 12,
        },
      })}
    >
      <Tab.Screen 
        name="Inicio" 
        component={InicioScreen} 
      />
      <Tab.Screen 
        name="Histórico" 
        component={HistoricoScreen} 
      />
      <Tab.Screen 
        name="Alertas" 
        component={AlertasScreen} 
        options={{
          tabBarBadge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: 'white',
            fontFamily: FONTS.bold,
            fontSize: 10,
            lineHeight: 14,
          }
        }}
      />
      <Tab.Screen 
        name="Configuración" 
        component={ConfiguracionScreen} 
      />
    </Tab.Navigator>
  );
}
