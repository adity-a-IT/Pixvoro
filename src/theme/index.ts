export const LightTheme = {
  dark: false,
  colors: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    surfaceSecondary: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    primary: '#4F46E5', // Indigo
    primaryLight: '#EEF2FF',
    primaryDark: '#3730A3',
    accent: '#06B6D4', // Cyan accent
    accentLight: '#ECFEFF',
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    shadow: 'rgba(15, 23, 42, 0.08)',
  },
};

export const DarkTheme = {
  dark: true,
  colors: {
    background: '#0B0F19', // Deep dark navy
    card: '#151C2C', // Glass dark card
    surfaceSecondary: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#2A364F',
    primary: '#6366F1', // Indigo light
    primaryLight: '#1E1B4B',
    primaryDark: '#818CF8',
    accent: '#22D3EE',
    accentLight: '#083344',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#451A03',
    danger: '#F87171',
    dangerLight: '#451212',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 9999,
};

export const Typography = {
  titleLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  titleSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};
