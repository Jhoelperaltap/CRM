import { create } from 'zustand';
import { getSecureItem, setSecureItem, deleteSecureItem, STORAGE_KEYS } from '../utils/storage';

export type LockType = 'biometric' | 'pin' | 'both' | 'none';

interface SecurityState {
  // Lock screen state
  isLocked: boolean;
  isAppLockEnabled: boolean;
  lockType: LockType;
  isBiometricAvailable: boolean;
  isBiometricEnrolled: boolean;

  // Settings state
  isHydrated: boolean;

  // Actions
  setLocked: (locked: boolean) => void;
  setAppLockEnabled: (enabled: boolean) => void;
  setLockType: (type: LockType) => void;
  setBiometricAvailable: (available: boolean) => void;
  setBiometricEnrolled: (enrolled: boolean) => void;
  setHydrated: (hydrated: boolean) => void;

  // PIN management
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: () => Promise<void>;
}

// Simple hash function for PIN (not cryptographically secure, but good for local verification)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  // Initial state
  isLocked: false,
  isAppLockEnabled: false,
  lockType: 'none',
  isBiometricAvailable: false,
  isBiometricEnrolled: false,
  isHydrated: false,

  // Actions
  setLocked: (locked) => set({ isLocked: locked }),

  setAppLockEnabled: async (enabled) => {
    await setSecureItem(STORAGE_KEYS.APP_LOCK_ENABLED, enabled ? 'true' : 'false');
    set({ isAppLockEnabled: enabled });
  },

  setLockType: async (type) => {
    await setSecureItem(STORAGE_KEYS.APP_LOCK_TYPE, type);
    set({ lockType: type });
  },

  setBiometricAvailable: (available) => set({ isBiometricAvailable: available }),
  setBiometricEnrolled: (enrolled) => set({ isBiometricEnrolled: enrolled }),
  setHydrated: (hydrated) => set({ isHydrated: hydrated }),

  // PIN management
  setPin: async (pin: string) => {
    const pinHash = hashPin(pin);
    await setSecureItem(STORAGE_KEYS.APP_PIN_HASH, pinHash);
  },

  verifyPin: async (pin: string) => {
    const storedHash = await getSecureItem(STORAGE_KEYS.APP_PIN_HASH);
    if (!storedHash) return false;
    return hashPin(pin) === storedHash;
  },

  clearPin: async () => {
    await deleteSecureItem(STORAGE_KEYS.APP_PIN_HASH);
  },
}));

/**
 * Hydrate security settings from secure storage
 */
export async function hydrateSecurityStore(): Promise<void> {
  try {
    const [lockEnabled, lockType, biometricEnabled] = await Promise.all([
      getSecureItem(STORAGE_KEYS.APP_LOCK_ENABLED),
      getSecureItem(STORAGE_KEYS.APP_LOCK_TYPE),
      getSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED),
    ]);

    useSecurityStore.setState({
      isAppLockEnabled: lockEnabled === 'true',
      lockType: (lockType as LockType) || 'none',
      isHydrated: true,
      // Lock the app if lock is enabled
      isLocked: lockEnabled === 'true',
    });
  } catch (error) {
    console.error('Failed to hydrate security store:', error);
    useSecurityStore.setState({ isHydrated: true });
  }
}

// Selectors
export const selectIsLocked = (state: SecurityState) => state.isLocked;
export const selectIsAppLockEnabled = (state: SecurityState) => state.isAppLockEnabled;
export const selectLockType = (state: SecurityState) => state.lockType;
export const selectIsBiometricAvailable = (state: SecurityState) => state.isBiometricAvailable;
