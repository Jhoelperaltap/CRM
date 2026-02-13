import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../../src/hooks/useAuth';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const { changePassword, isChangingPassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to change password');
    }
  };

  if (success) {
    return (
      <View
        style={[styles.successContainer, { backgroundColor: theme.colors.background }]}
      >
        <MaterialCommunityIcons
          name="check-circle"
          size={80}
          color={theme.colors.primary}
          style={styles.successIcon}
        />
        <Text variant="headlineSmall" style={styles.successTitle}>
          Password Changed!
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.successDescription, { color: theme.colors.onSurfaceVariant }]}
        >
          Your password has been successfully updated.
        </Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.doneButton}>
          Done
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          Enter your current password and choose a new password.
        </Text>

        <TextInput
          mode="outlined"
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry={!showPasswords}
          autoCapitalize="none"
          style={styles.input}
          left={<TextInput.Icon icon="lock" />}
        />

        <TextInput
          mode="outlined"
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPasswords}
          autoCapitalize="none"
          style={styles.input}
          left={<TextInput.Icon icon="lock-plus" />}
        />

        <TextInput
          mode="outlined"
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPasswords}
          autoCapitalize="none"
          style={styles.input}
          left={<TextInput.Icon icon="lock-check" />}
          right={
            <TextInput.Icon
              icon={showPasswords ? 'eye-off' : 'eye'}
              onPress={() => setShowPasswords(!showPasswords)}
            />
          }
        />

        {error && (
          <HelperText type="error" visible={true} style={styles.error}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isChangingPassword}
          disabled={isChangingPassword}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          Change Password
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  description: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  error: {
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  successDescription: {
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    minWidth: 200,
  },
});
