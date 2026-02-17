import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import {
  Text,
  Card,
  Switch,
  List,
  Button,
  useTheme,
  Divider,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSecurityStore, LockType } from '../../../src/stores/security-store';
import { useBiometricAuth } from '../../../src/hooks/useBiometricAuth';
import { iconColors, darkIconColors } from '../../../src/constants/colors';

const PIN_LENGTH = 4;

export default function SecuritySettingsScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const icons = colorScheme === 'dark' ? darkIconColors : iconColors;

  const {
    isAppLockEnabled,
    lockType,
    setAppLockEnabled,
    setLockType,
    setPin,
    verifyPin,
    clearPin,
  } = useSecurityStore();

  const { isBiometricAvailable, getBiometricType } = useBiometricAuth();
  const { isBiometricEnrolled } = useSecurityStore();

  const [biometricTypeName, setBiometricTypeName] = useState('Biometrics');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm' | 'verify'>('enter');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | 'change' | null>(null);

  useEffect(() => {
    getBiometricType().then(setBiometricTypeName);
  }, [getBiometricType]);

  const handleToggleAppLock = useCallback(async () => {
    if (isAppLockEnabled) {
      // Turning off - need to verify PIN first
      setPendingAction('disable');
      setPinStep('verify');
      setShowPinDialog(true);
    } else {
      // Turning on - need to set up PIN
      setPendingAction('enable');
      setPinStep('enter');
      setShowPinDialog(true);
    }
  }, [isAppLockEnabled]);

  const handleToggleBiometric = useCallback(async () => {
    if (!isBiometricAvailable || !isBiometricEnrolled) {
      Alert.alert(
        'Biometrics Unavailable',
        `${biometricTypeName} is not set up on this device. Please configure it in your device settings first.`
      );
      return;
    }

    if (lockType === 'biometric') {
      // Switch to PIN only
      setLockType('pin');
    } else if (lockType === 'pin') {
      // Add biometric
      setLockType('both');
    } else if (lockType === 'both') {
      // Remove biometric
      setLockType('pin');
    } else {
      // Enable with biometric only
      if (!isAppLockEnabled) {
        setPendingAction('enable');
        setPinStep('enter');
        setShowPinDialog(true);
        return;
      }
      setLockType('both');
    }
  }, [lockType, isBiometricAvailable, isBiometricEnrolled, isAppLockEnabled, biometricTypeName, setLockType]);

  const handleChangePin = useCallback(() => {
    setPendingAction('change');
    setPinStep('verify');
    setShowPinDialog(true);
  }, []);

  const handlePinSubmit = useCallback(async () => {
    if (pinStep === 'verify') {
      const isValid = await verifyPin(currentPin);
      if (!isValid) {
        setPinError('Invalid PIN');
        setCurrentPin('');
        return;
      }

      if (pendingAction === 'disable') {
        await setAppLockEnabled(false);
        setLockType('none');
        await clearPin();
        resetPinDialog();
        Alert.alert('Success', 'App lock has been disabled');
      } else if (pendingAction === 'change') {
        setPinStep('enter');
        setCurrentPin('');
        setPinError('');
      }
    } else if (pinStep === 'enter') {
      if (newPin.length !== PIN_LENGTH) {
        setPinError(`PIN must be ${PIN_LENGTH} digits`);
        return;
      }
      setPinStep('confirm');
      setPinError('');
    } else if (pinStep === 'confirm') {
      if (confirmPin !== newPin) {
        setPinError('PINs do not match');
        setConfirmPin('');
        return;
      }

      await setPin(newPin);
      await setAppLockEnabled(true);

      if (isBiometricAvailable && isBiometricEnrolled) {
        setLockType('both');
      } else {
        setLockType('pin');
      }

      resetPinDialog();
      Alert.alert('Success', pendingAction === 'change' ? 'PIN changed successfully' : 'App lock enabled');
    }
  }, [pinStep, currentPin, newPin, confirmPin, pendingAction, verifyPin, setAppLockEnabled, setLockType, clearPin, setPin, isBiometricAvailable, isBiometricEnrolled]);

  const resetPinDialog = () => {
    setShowPinDialog(false);
    setPinStep('enter');
    setNewPin('');
    setConfirmPin('');
    setCurrentPin('');
    setPinError('');
    setPendingAction(null);
  };

  const getPinDialogTitle = () => {
    if (pinStep === 'verify') return 'Enter Current PIN';
    if (pinStep === 'enter') return 'Create New PIN';
    return 'Confirm New PIN';
  };

  const getPinValue = () => {
    if (pinStep === 'verify') return currentPin;
    if (pinStep === 'enter') return newPin;
    return confirmPin;
  };

  const setPinValue = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
    if (pinStep === 'verify') setCurrentPin(numericValue);
    else if (pinStep === 'enter') setNewPin(numericValue);
    else setConfirmPin(numericValue);
    setPinError('');
  };

  const biometricEnabled =
    isAppLockEnabled && (lockType === 'biometric' || lockType === 'both');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Security',
          headerBackTitle: 'Profile',
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* App Lock Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              App Lock
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}
            >
              Protect your sensitive information with a PIN or biometrics
            </Text>

            <Divider style={styles.divider} />

            <List.Item
              title="Enable App Lock"
              description="Require authentication to open the app"
              left={() => (
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <MaterialCommunityIcons
                    name="lock"
                    size={24}
                    color={icons.lock}
                  />
                </View>
              )}
              right={() => (
                <Switch
                  value={isAppLockEnabled}
                  onValueChange={handleToggleAppLock}
                  color={theme.colors.primary}
                />
              )}
            />

            {isAppLockEnabled && (
              <>
                <Divider style={styles.itemDivider} />

                <List.Item
                  title={`Use ${biometricTypeName}`}
                  description={
                    isBiometricAvailable && isBiometricEnrolled
                      ? `Unlock with ${biometricTypeName.toLowerCase()}`
                      : `${biometricTypeName} not available`
                  }
                  left={() => (
                    <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                      <MaterialCommunityIcons
                        name={biometricTypeName.includes('Face') ? 'face-recognition' : 'fingerprint'}
                        size={24}
                        color={icons.success}
                      />
                    </View>
                  )}
                  right={() => (
                    <Switch
                      value={biometricEnabled}
                      onValueChange={handleToggleBiometric}
                      disabled={!isBiometricAvailable || !isBiometricEnrolled}
                      color={theme.colors.primary}
                    />
                  )}
                />

                <Divider style={styles.itemDivider} />

                <List.Item
                  title="Change PIN"
                  description="Update your security PIN"
                  left={() => (
                    <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                      <MaterialCommunityIcons
                        name="numeric"
                        size={24}
                        color={icons.warning}
                      />
                    </View>
                  )}
                  right={() => (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                  onPress={handleChangePin}
                />
              </>
            )}
          </Card.Content>
        </Card>

        {/* Security Tips */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Security Tips
            </Text>

            <View style={styles.tipItem}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={icons.success}
              />
              <Text variant="bodySmall" style={styles.tipText}>
                Use a unique PIN that you don't use elsewhere
              </Text>
            </View>

            <View style={styles.tipItem}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={icons.success}
              />
              <Text variant="bodySmall" style={styles.tipText}>
                Enable biometrics for faster and more secure access
              </Text>
            </View>

            <View style={styles.tipItem}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={icons.success}
              />
              <Text variant="bodySmall" style={styles.tipText}>
                Never share your PIN with anyone
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* PIN Dialog */}
      <Portal>
        <Dialog visible={showPinDialog} onDismiss={resetPinDialog}>
          <Dialog.Title>{getPinDialogTitle()}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="PIN"
              value={getPinValue()}
              onChangeText={setPinValue}
              keyboardType="numeric"
              secureTextEntry
              maxLength={PIN_LENGTH}
              autoFocus
              error={!!pinError}
            />
            {pinError ? (
              <Text style={[styles.dialogError, { color: theme.colors.error }]}>
                {pinError}
              </Text>
            ) : null}
            <Text
              variant="bodySmall"
              style={[styles.dialogHint, { color: theme.colors.onSurfaceVariant }]}
            >
              Enter a {PIN_LENGTH}-digit PIN
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={resetPinDialog}>Cancel</Button>
            <Button
              onPress={handlePinSubmit}
              disabled={getPinValue().length !== PIN_LENGTH}
            >
              {pinStep === 'confirm' ? 'Confirm' : 'Next'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  itemDivider: {
    marginVertical: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  tipText: {
    flex: 1,
  },
  dialogError: {
    marginTop: 8,
  },
  dialogHint: {
    marginTop: 8,
  },
});
