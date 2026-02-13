// Material Design 3 color scheme for Ebenezer Client Portal
export const colors = {
  // Primary colors
  primary: '#1976D2',
  primaryContainer: '#BBDEFB',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#0D47A1',

  // Secondary colors
  secondary: '#424242',
  secondaryContainer: '#E0E0E0',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#212121',

  // Tertiary colors
  tertiary: '#7B1FA2',
  tertiaryContainer: '#E1BEE7',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#4A148C',

  // Error colors
  error: '#D32F2F',
  errorContainer: '#FFCDD2',
  onError: '#FFFFFF',
  onErrorContainer: '#B71C1C',

  // Success colors
  success: '#388E3C',
  successContainer: '#C8E6C9',
  onSuccess: '#FFFFFF',
  onSuccessContainer: '#1B5E20',

  // Warning colors
  warning: '#F57C00',
  warningContainer: '#FFE0B2',
  onWarning: '#FFFFFF',
  onWarningContainer: '#E65100',

  // Background colors
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  onBackground: '#212121',
  onSurface: '#212121',
  onSurfaceVariant: '#757575',

  // Outline colors
  outline: '#BDBDBD',
  outlineVariant: '#E0E0E0',

  // Other
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#212121',
  inverseOnSurface: '#FFFFFF',
  inversePrimary: '#90CAF9',
} as const;

// Dark mode colors
export const darkColors = {
  // Primary colors
  primary: '#90CAF9',
  primaryContainer: '#0D47A1',
  onPrimary: '#003C8F',
  onPrimaryContainer: '#BBDEFB',

  // Secondary colors
  secondary: '#BDBDBD',
  secondaryContainer: '#424242',
  onSecondary: '#212121',
  onSecondaryContainer: '#E0E0E0',

  // Tertiary colors
  tertiary: '#CE93D8',
  tertiaryContainer: '#4A148C',
  onTertiary: '#38006B',
  onTertiaryContainer: '#E1BEE7',

  // Error colors
  error: '#EF9A9A',
  errorContainer: '#B71C1C',
  onError: '#690005',
  onErrorContainer: '#FFCDD2',

  // Success colors
  success: '#A5D6A7',
  successContainer: '#1B5E20',
  onSuccess: '#003300',
  onSuccessContainer: '#C8E6C9',

  // Warning colors
  warning: '#FFCC80',
  warningContainer: '#E65100',
  onWarning: '#4E2600',
  onWarningContainer: '#FFE0B2',

  // Background colors
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2C',
  onBackground: '#E0E0E0',
  onSurface: '#E0E0E0',
  onSurfaceVariant: '#BDBDBD',

  // Outline colors
  outline: '#616161',
  outlineVariant: '#424242',

  // Other
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#E0E0E0',
  inverseOnSurface: '#212121',
  inversePrimary: '#1976D2',
} as const;

// Status colors for badges
export const statusColors = {
  pending: {
    background: '#FFF3E0',
    text: '#E65100',
  },
  approved: {
    background: '#E8F5E9',
    text: '#2E7D32',
  },
  rejected: {
    background: '#FFEBEE',
    text: '#C62828',
  },
  in_progress: {
    background: '#E3F2FD',
    text: '#1565C0',
  },
  completed: {
    background: '#E8F5E9',
    text: '#2E7D32',
  },
  open: {
    background: '#E3F2FD',
    text: '#1565C0',
  },
  closed: {
    background: '#ECEFF1',
    text: '#546E7A',
  },
} as const;

export type StatusColorKey = keyof typeof statusColors;
