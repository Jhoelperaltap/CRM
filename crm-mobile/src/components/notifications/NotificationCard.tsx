import React from 'react';
import { StyleSheet, Pressable, View, useColorScheme } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  PortalNotification,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
} from '../../types/notifications';
import { formatSmartTime } from '../../utils/date';
import { iconColors, darkIconColors } from '../../constants/colors';

interface NotificationCardProps {
  notification: PortalNotification;
  onPress: () => void;
}

// Map notification types to icon colors
const notificationColorMap: Record<string, { icon: keyof typeof iconColors; bg: string }> = {
  new_message: { icon: 'newMessage', bg: '#F3E5F5' },
  case_update: { icon: 'caseUpdate', bg: '#FFF3E0' },
  document_status: { icon: 'documentStatus', bg: '#E3F2FD' },
  appointment_reminder: { icon: 'appointmentReminder', bg: '#FCE4EC' },
  system: { icon: 'system', bg: '#ECEFF1' },
};

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const icons = colorScheme === 'dark' ? darkIconColors : iconColors;
  const isUnread = !notification.is_read;

  const iconName = NOTIFICATION_TYPE_ICONS[notification.notification_type] || 'bell';
  const typeLabel = NOTIFICATION_TYPE_LABELS[notification.notification_type] || 'Notification';

  const colorConfig = notificationColorMap[notification.notification_type] || notificationColorMap.system;
  const iconColor = icons[colorConfig.icon as keyof typeof icons] || icons.system;

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
                    backgroundColor: isUnread ? colorConfig.bg : theme.colors.surfaceVariant,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={20}
                  color={isUnread ? iconColor : theme.colors.onSurfaceVariant}
                />
              </View>
              {isUnread && (
                <View
                  style={[styles.unreadDot, { backgroundColor: iconColor }]}
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
