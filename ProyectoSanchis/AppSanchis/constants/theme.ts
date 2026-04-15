export const Colors = {
  // Primary palette
  primary: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryLight: '#93c5fd',

  // Semantic colors
  success: '#10b981',
  successDark: '#059669',
  warning: '#f59e0b',
  warningDark: '#d97706',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  info: '#06b6d4',

  // Neutral palette
  background: '#0f172a',
  surface: '#1e293b',
  surfaceElevated: '#293548',
  border: '#334155',
  borderLight: '#475569',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textOnPrimary: '#ffffff',

  // State badges
  badgeNoIniciado: '#6366f1',
  badgeEnCurso: '#f59e0b',
  badgeFinalizado: '#10b981',
  badgePausado: '#94a3b8',
};

export const Typography = {
  fontFamily: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const getStateBadge = (state: string): { label: string; color: string; bg: string } => {
  switch (state) {
    case 'no_iniciado':
      return { label: 'Sin iniciar', color: '#a5b4fc', bg: '#312e81' };
    case 'en_curso':
      return { label: 'En curso', color: '#fde68a', bg: '#78350f' };
    case 'finalizado':
      return { label: 'Finalizado', color: '#6ee7b7', bg: '#064e3b' };
    case 'pausado':
      return { label: 'Pausado', color: '#cbd5e1', bg: '#1e293b' };
    default:
      return { label: state, color: '#94a3b8', bg: '#1e293b' };
  }
};
