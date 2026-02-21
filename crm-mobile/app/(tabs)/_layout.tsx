import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useTheme, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore, selectIsAuthenticated, selectIsHydrated } from '../../src/stores/auth-store';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { getUnreadCount } from '../../src/api/notifications';
import { iconColors, darkIconColors } from '../../src/constants/colors';

export default function TabsLayout() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const icons = colorScheme === 'dark' ? darkIconColors : iconColors;
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore(selectIsHydrated);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize push notifications
  usePushNotifications();

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      // Silently ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Redirect to login if not authenticated
  if (isHydrated && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={focused ? icons.home : theme.colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: 'Cases',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? "folder" : "folder-outline"}
              size={size}
              color={focused ? icons.cases : theme.colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? "file-document" : "file-document-outline"}
              size={size}
              color={focused ? icons.documents : theme.colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? "message" : "message-outline"}
              size={size}
              color={focused ? icons.messages : theme.colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? "robot" : "robot-outline"}
              size={size}
              color={focused ? icons.chat : theme.colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? "receipt" : "receipt"}
              size={size}
              color={focused ? icons.billing : theme.colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? "calendar" : "calendar-outline"}
              size={size}
              color={focused ? icons.appointments : theme.colors.onSurfaceVariant}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <View>
              <MaterialCommunityIcons
                name={focused ? "bell" : "bell-outline"}
                size={size}
                color={focused ? icons.notifications : theme.colors.onSurfaceVariant}
              />
              {unreadCount > 0 && (
                <Badge
                  size={16}
                  style={[
                    styles.badge,
                    { backgroundColor: icons.notifications },
                  ]}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? "account" : "account-outline"}
              size={size}
              color={focused ? icons.profile : theme.colors.onSurfaceVariant}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
});
