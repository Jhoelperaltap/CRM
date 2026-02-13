import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { confirmPasswordReset, isConfirmingReset } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const result = await confirmPasswordReset(token, password);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to reset password');
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.successContainer}>
          <MaterialCommunityIcons
            name="check-circle"
            size={80}
            color={theme.colors.primary}
            style={styles.successIcon}
          />
          <Text variant="headlineSmall" style={styles.successTitle}>
            Password Reset!
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.successDescription, { color: theme.colors.onSurfaceVariant }]}
          >
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backButton}
          >
            Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={80}
            color={theme.colors.error}
            style={styles.errorIcon}
          />
          <Text variant="headlineSmall" style={styles.errorTitle}>
            Invalid Link
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.errorDescription, { color: theme.colors.onSurfaceVariant }]}
          >
            This password reset link is invalid or has expired. Please request a new one.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/forgot-password')}
            style={styles.backButton}
          >
            Request New Link
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={64}
              color={theme.colors.primary}
              style={styles.icon}
            />
            <Text variant="headlineMedium" style={styles.title}>
              Reset Password
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
            >
              Enter your new password below.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="New Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <TextInput
              mode="outlined"
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="lock-check" />}
            />

            {error && (
              <HelperText type="error" visible={true} style={styles.error}>
                {error}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isConfirmingReset}
              disabled={isConfirmingReset}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Reset Password
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
    paddingHorizontal: 16,
  },
  backButton: {
    minWidth: 200,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorDescription: {
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
});
