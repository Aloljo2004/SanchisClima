export const COLORS = {
  background: '#0F172A',     // Slate 900 (fondo general oscuro)
  white: '#1E293B',          // Slate 800 (tarjetas, inputs, etc. en modo oscuro)
  primary: '#3B82F6',        // Azul vibrante (marca / enlaces en modo oscuro)
  primaryLight: '#1E3A8A',   // Azul profundo para acentos de fondo
  entrada: '#059669',        // Verde esmeralda para botón Entrada
  entradaBg: '#022C22',      // Verde muy oscuro para fondo de filas de Entrada
  entradaAccent: '#10B981',  // Verde vibrante para borde izquierdo
  salida: '#DC2626',         // Rojo para botón Salida
  salidaBg: '#450A0A',       // Rojo muy oscuro para fondo de filas de Salida
  salidaAccent: '#EF4444',   // Rojo vibrante para borde izquierdo
  teal: '#2DD4BF',           // Verde azulado claro / teal para toggles activos en oscuro
  grayDark: '#F8FAFC',       // Slate 50 (texto principal en oscuro)
  grayMedium: '#94A3B8',     // Slate 400 (texto secundario en oscuro)
  grayLight: '#475569',      // Slate 600 (bordes y divisores en oscuro)
  grayLightest: '#334155',   // Slate 700 (fondos secundarios / inputs)
  disabled: '#64748B',       // Slate 500 (deshabilitado)
  shadowColor: '#000000',
};

export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

export const SHADOWS = {
  soft: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
};

export const BORDER_RADIUS = {
  small: 6,
  input: 8,
  card: 12,
  large: 16,
  round: 9999,
};
