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
  // Invoice statuses
  draft: {
    background: '#ECEFF1',
    text: '#546E7A',
  },
  sent: {
    background: '#E3F2FD',
    text: '#1565C0',
  },
  paid: {
    background: '#E8F5E9',
    text: '#2E7D32',
  },
  overdue: {
    background: '#FFEBEE',
    text: '#C62828',
  },
  cancelled: {
    background: '#FAFAFA',
    text: '#9E9E9E',
  },
  // Quote statuses
  accepted: {
    background: '#E8F5E9',
    text: '#2E7D32',
  },
  expired: {
    background: '#FFF3E0',
    text: '#E65100',
  },
  converted: {
    background: '#E1F5FE',
    text: '#0277BD',
  },
} as const;

export type StatusColorKey = keyof typeof statusColors;

// Vibrant icon colors for a more lively UI
export const iconColors = {
  // Navigation tab icons
  home: '#4CAF50',        // Green
  cases: '#FF9800',       // Orange
  documents: '#2196F3',   // Blue
  messages: '#9C27B0',    // Purple
  chat: '#00BCD4',        // Cyan
  appointments: '#E91E63', // Pink
  notifications: '#F44336', // Red
  profile: '#607D8B',     // Blue Gray
  billing: '#00897B',     // Teal

  // Dashboard stat icons
  activeCases: '#FF5722',    // Deep Orange
  unreadMessages: '#673AB7', // Deep Purple
  upcomingAppointments: '#009688', // Teal

  // Document type icons
  pdf: '#F44336',         // Red
  image: '#4CAF50',       // Green
  word: '#2196F3',        // Blue
  excel: '#4CAF50',       // Green
  text: '#9E9E9E',        // Gray
  generic: '#757575',     // Dark Gray

  // Action icons
  upload: '#00BCD4',      // Cyan
  download: '#4CAF50',    // Green
  send: '#2196F3',        // Blue
  edit: '#FF9800',        // Orange
  delete: '#F44336',      // Red
  add: '#4CAF50',         // Green

  // Status icons
  success: '#4CAF50',     // Green
  warning: '#FF9800',     // Orange
  error: '#F44336',       // Red
  info: '#2196F3',        // Blue

  // Profile icons
  phone: '#4CAF50',       // Green
  address: '#E91E63',     // Pink
  birthday: '#FF9800',    // Orange
  security: '#607D8B',    // Blue Gray
  logout: '#F44336',      // Red
  lock: '#9C27B0',        // Purple

  // Notification type icons
  newMessage: '#9C27B0',  // Purple
  caseUpdate: '#FF9800',  // Orange
  documentStatus: '#2196F3', // Blue
  appointmentReminder: '#E91E63', // Pink
  system: '#607D8B',      // Blue Gray

  // Checklist icons
  completed: '#4CAF50',   // Green
  pending: '#FF9800',     // Orange
  overdue: '#F44336',     // Red
} as const;

// Dark mode icon colors (slightly brighter for visibility)
export const darkIconColors = {
  // Navigation tab icons
  home: '#66BB6A',        // Light Green
  cases: '#FFB74D',       // Light Orange
  documents: '#64B5F6',   // Light Blue
  messages: '#BA68C8',    // Light Purple
  chat: '#4DD0E1',        // Light Cyan
  appointments: '#F06292', // Light Pink
  notifications: '#EF5350', // Light Red
  profile: '#90A4AE',     // Light Blue Gray
  billing: '#4DB6AC',     // Light Teal

  // Dashboard stat icons
  activeCases: '#FF7043',    // Light Deep Orange
  unreadMessages: '#9575CD', // Light Deep Purple
  upcomingAppointments: '#4DB6AC', // Light Teal

  // Document type icons
  pdf: '#EF5350',         // Light Red
  image: '#66BB6A',       // Light Green
  word: '#64B5F6',        // Light Blue
  excel: '#66BB6A',       // Light Green
  text: '#BDBDBD',        // Light Gray
  generic: '#9E9E9E',     // Gray

  // Action icons
  upload: '#4DD0E1',      // Light Cyan
  download: '#66BB6A',    // Light Green
  send: '#64B5F6',        // Light Blue
  edit: '#FFB74D',        // Light Orange
  delete: '#EF5350',      // Light Red
  add: '#66BB6A',         // Light Green

  // Status icons
  success: '#66BB6A',     // Light Green
  warning: '#FFB74D',     // Light Orange
  error: '#EF5350',       // Light Red
  info: '#64B5F6',        // Light Blue

  // Profile icons
  phone: '#66BB6A',       // Light Green
  address: '#F06292',     // Light Pink
  birthday: '#FFB74D',    // Light Orange
  security: '#90A4AE',    // Light Blue Gray
  logout: '#EF5350',      // Light Red
  lock: '#BA68C8',        // Light Purple

  // Notification type icons
  newMessage: '#BA68C8',  // Light Purple
  caseUpdate: '#FFB74D',  // Light Orange
  documentStatus: '#64B5F6', // Light Blue
  appointmentReminder: '#F06292', // Light Pink
  system: '#90A4AE',      // Light Blue Gray

  // Checklist icons
  completed: '#66BB6A',   // Light Green
  pending: '#FFB74D',     // Light Orange
  overdue: '#EF5350',     // Light Red
} as const;
