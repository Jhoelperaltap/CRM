import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme, MD3DarkTheme, Portal } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, darkColors } from '../src/constants/colors';
import { hydrateAuthStore } from '../src/stores/auth-store';
import { hydrateSecurityStore, useSecurityStore, selectIsLocked, selectIsAppLockEnabled } from '../src/stores/security-store';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';
import { LockScreen } from '../src/components/security/LockScreen';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Create custom themes
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryContainer,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryContainer,
    error: colors.error,
    errorContainer: colors.errorContainer,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    outline: colors.outline,
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    primaryContainer: darkColors.primaryContainer,
    secondary: darkColors.secondary,
    secondaryContainer: darkColors.secondaryContainer,
    error: darkColors.error,
    errorContainer: darkColors.errorContainer,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceVariant,
    outline: darkColors.outline,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Security state
  const isLocked = useSecurityStore(selectIsLocked);
  const isAppLockEnabled = useSecurityStore(selectIsAppLockEnabled);

  useEffect(() => {
    // Hydrate both auth and security stores from secure storage
    Promise.all([
      hydrateAuthStore(),
      hydrateSecurityStore(),
    ]).finally(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Loading..." />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            {/* Show lock screen if app is locked */}
            {isAppLockEnabled && isLocked ? (
              <LockScreen />
            ) : (
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            )}
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
