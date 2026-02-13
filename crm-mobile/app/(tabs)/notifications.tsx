import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useTheme, Text, Button, Appbar } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationCard } from '../../src/components/notifications/NotificationCard';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../src/api/notifications';
import { PortalNotification } from '../../src/types/notifications';

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await getNotifications();
      setNotifications(data.results);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback(
    async (notification: PortalNotification) => {
      // Mark as read
      if (!notification.is_read) {
        try {
          await markNotificationAsRead(notification.id);
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          );
        } catch (err) {
          // Ignore error
        }
      }

      // Navigate based on notification type
      if (notification.notification_type === 'new_message' && notification.related_message_id) {
        router.push(`/(tabs)/messages/${notification.related_message_id}`);
      } else if (notification.notification_type === 'case_update' && notification.related_case_id) {
        router.push(`/(tabs)/cases/${notification.related_case_id}`);
      } else if (notification.notification_type === 'appointment_reminder') {
        router.push('/(tabs)/appointments');
      }
    },
    [router]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      // Ignore error
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchNotifications} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content title="Notifications" />
        {unreadCount > 0 && (
          <Appbar.Action icon="check-all" onPress={handleMarkAllRead} />
        )}
      </Appbar.Header>

      {notifications.length === 0 ? (
        <EmptyState
          icon="bell-outline"
          title="No Notifications"
          description="You're all caught up! New notifications will appear here."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            unreadCount > 0 ? (
              <View style={styles.header}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
