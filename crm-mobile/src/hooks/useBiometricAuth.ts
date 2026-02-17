import { useCallback, useEffect } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSecurityStore } from '../stores/security-store';

interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export function useBiometricAuth() {
  const {
    isLocked,
    isAppLockEnabled,
    lockType,
    isBiometricAvailable,
    setLocked,
    setBiometricAvailable,
    setBiometricEnrolled,
  } = useSecurityStore();

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Lock the app when going to background (if lock is enabled)
        if (isAppLockEnabled) {
          setLocked(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAppLockEnabled, setLocked]);

  const checkBiometricAvailability = useCallback(async () => {
    if (Platform.OS === 'web') {
      setBiometricAvailable(false);
      return;
    }

    try {
      // Check if hardware is available
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setBiometricAvailable(compatible);

      if (compatible) {
        // Check if biometrics are enrolled
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricEnrolled(enrolled);
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  }, [setBiometricAvailable, setBiometricEnrolled]);

  const authenticateWithBiometrics = useCallback(async (): Promise<BiometricAuthResult> => {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Biometrics not available on web' };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Ebenezer Portal',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setLocked(false);
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  }, [setLocked]);

  const unlockWithPin = useCallback(async (pin: string): Promise<BiometricAuthResult> => {
    const isValid = await useSecurityStore.getState().verifyPin(pin);

    if (isValid) {
      setLocked(false);
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid PIN',
    };
  }, [setLocked]);

  const getBiometricType = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') return 'none';

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }

    return 'Biometrics';
  }, []);

  return {
    isLocked,
    isAppLockEnabled,
    lockType,
    isBiometricAvailable,
    authenticateWithBiometrics,
    unlockWithPin,
    checkBiometricAvailability,
    getBiometricType,
    setLocked,
  };
}
