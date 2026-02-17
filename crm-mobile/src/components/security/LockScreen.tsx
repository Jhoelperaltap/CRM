import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Vibration,
  useColorScheme,
} from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useSecurityStore } from '../../stores/security-store';
import { iconColors, darkIconColors } from '../../constants/colors';

const PIN_LENGTH = 4;

export function LockScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const icons = colorScheme === 'dark' ? darkIconColors : iconColors;

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricType, setBiometricType] = useState('Biometrics');

  const {
    lockType,
    isBiometricAvailable,
    authenticateWithBiometrics,
    unlockWithPin,
    getBiometricType,
  } = useBiometricAuth();

  const { isBiometricEnrolled } = useSecurityStore();

  // Get biometric type name on mount
  useEffect(() => {
    getBiometricType().then(setBiometricType);
  }, [getBiometricType]);

  // Try biometric auth on mount if available
  useEffect(() => {
    if (
      isBiometricAvailable &&
      isBiometricEnrolled &&
      (lockType === 'biometric' || lockType === 'both')
    ) {
      handleBiometricAuth();
    }
  }, []);

  const handleBiometricAuth = useCallback(async () => {
    const result = await authenticateWithBiometrics();
    if (!result.success) {
      setError(result.error || 'Authentication failed');
    }
  }, [authenticateWithBiometrics]);

  const handlePinInput = useCallback(
    async (digit: string) => {
      if (pin.length >= PIN_LENGTH) return;

      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === PIN_LENGTH) {
        const result = await unlockWithPin(newPin);
        if (!result.success) {
          Vibration.vibrate(100);
          setError('Invalid PIN');
          setPin('');
        }
      }
    },
    [pin, unlockWithPin]
  );

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  const canUseBiometric =
    isBiometricAvailable &&
    isBiometricEnrolled &&
    (lockType === 'biometric' || lockType === 'both');

  const canUsePin = lockType === 'pin' || lockType === 'both';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name="shield-lock"
            size={48}
            color={theme.colors.primary}
          />
        </View>
        <Text variant="headlineSmall" style={styles.title}>
          Ebenezer Portal
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Enter your PIN to unlock
        </Text>
      </View>

      {/* PIN Display */}
      {canUsePin && (
        <View style={styles.pinContainer}>
          <View style={styles.pinDots}>
            {Array.from({ length: PIN_LENGTH }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  {
                    backgroundColor:
                      index < pin.length
                        ? theme.colors.primary
                        : theme.colors.outlineVariant,
                  },
                ]}
              />
            ))}
          </View>

          {error ? (
            <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
          ) : null}
        </View>
      )}

      {/* Keypad */}
      {canUsePin && (
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            [canUseBiometric ? 'biometric' : '', '0', 'delete'],
          ].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key, keyIndex) => {
                if (key === '') {
                  return <View key={keyIndex} style={styles.keyEmpty} />;
                }

                if (key === 'biometric') {
                  return (
                    <Pressable
                      key={keyIndex}
                      style={[styles.key, { backgroundColor: theme.colors.primaryContainer }]}
                      onPress={handleBiometricAuth}
                    >
                      <MaterialCommunityIcons
                        name={biometricType.includes('Face') ? 'face-recognition' : 'fingerprint'}
                        size={28}
                        color={theme.colors.primary}
                      />
                    </Pressable>
                  );
                }

                if (key === 'delete') {
                  return (
                    <Pressable
                      key={keyIndex}
                      style={styles.key}
                      onPress={handleDelete}
                      onLongPress={() => setPin('')}
                    >
                      <MaterialCommunityIcons
                        name="backspace-outline"
                        size={28}
                        color={theme.colors.onSurface}
                      />
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={keyIndex}
                    style={({ pressed }) => [
                      styles.key,
                      {
                        backgroundColor: pressed
                          ? theme.colors.surfaceVariant
                          : 'transparent',
                      },
                    ]}
                    onPress={() => handlePinInput(key)}
                  >
                    <Text variant="headlineMedium">{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {/* Biometric Only Mode */}
      {lockType === 'biometric' && canUseBiometric && (
        <View style={styles.biometricOnly}>
          <Pressable
            style={[styles.biometricButton, { backgroundColor: theme.colors.primaryContainer }]}
            onPress={handleBiometricAuth}
          >
            <MaterialCommunityIcons
              name={biometricType.includes('Face') ? 'face-recognition' : 'fingerprint'}
              size={64}
              color={theme.colors.primary}
            />
          </Pressable>
          <Text
            variant="bodyLarge"
            style={[styles.biometricText, { color: theme.colors.onSurfaceVariant }]}
          >
            Tap to use {biometricType}
          </Text>
          {error ? (
            <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  error: {
    marginTop: 16,
    textAlign: 'center',
  },
  keypad: {
    width: '100%',
    maxWidth: 300,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  keyEmpty: {
    width: 72,
    height: 72,
    marginHorizontal: 12,
  },
  biometricOnly: {
    alignItems: 'center',
  },
  biometricButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  biometricText: {
    textAlign: 'center',
  },
});
