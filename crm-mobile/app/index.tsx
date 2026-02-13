import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuthStore, selectIsAuthenticated, selectIsHydrated } from '../src/stores/auth-store';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';

export default function Index() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore(selectIsHydrated);

  // Wait for store to hydrate
  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Loading..." />
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
