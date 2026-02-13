import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  PortalNotification,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
} from '../../types/notifications';
import { formatSmartTime } from '../../utils/date';

interface NotificationCardProps {
  notification: PortalNotification;
  onPress: () => void;
}

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const theme = useTheme();
  const isUnread = !notification.is_read;

  const iconName = NOTIFICATION_TYPE_ICONS[notification.notification_type] || 'bell';
  const typeLabel = NOTIFICATION_TYPE_LABELS[notification.notification_type] || 'Notification';

  return (
    <Pressable onPress={onPress}>
      <Card
        style={[
          styles.card,
          isUnread && { backgroundColor: theme.colors.primaryContainer + '20' },
        ]}
        mode="elevated"
      >
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconBackground,
                  {
                    backgroundColor: isUnread
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={20}
                  color={isUnread ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                />
              </View>
              {isUnread && (
                <View
                  style={[styles.unreadDot, { backgroundColor: theme.colors.error }]}
                />
              )}
            </View>

            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text
                  variant="titleSmall"
                  style={[styles.title, isUnread && styles.unreadText]}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text
                  variant="labelSmall"
                  style={[styles.time, { color: theme.colors.onSurfaceVariant }]}
                >
                  {formatSmartTime(notification.created_at)}
                </Text>
              </View>

              <Text
                variant="labelSmall"
                style={[styles.type, { color: theme.colors.primary }]}
              >
                {typeLabel}
              </Text>

              {notification.message && (
                <Text
                  variant="bodySmall"
                  style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
                  numberOfLines={2}
                >
                  {notification.message}
                </Text>
              )}

              {notification.related_case_number && (
                <Text
                  variant="labelSmall"
                  style={[styles.case, { color: theme.colors.tertiary }]}
                >
                  <MaterialCommunityIcons name="folder" size={12} /> Case #{notification.related_case_number}
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  content: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '700',
  },
  time: {},
  type: {
    marginBottom: 4,
  },
  message: {
    marginTop: 4,
  },
  case: {
    marginTop: 6,
  },
});
