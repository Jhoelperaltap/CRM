import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Card, Text, useTheme, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortalMessage } from '../../types/messages';
import { formatSmartTime } from '../../utils/date';

interface ThreadPreviewProps {
  message: PortalMessage;
  onPress: () => void;
}

export function ThreadPreview({ message, onPress }: ThreadPreviewProps) {
  const theme = useTheme();
  const isUnread = !message.is_read;

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
            <View style={styles.senderRow}>
              {isUnread && (
                <View
                  style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]}
                />
              )}
              <Text
                variant="titleMedium"
                style={[styles.subject, isUnread && styles.unreadText]}
                numberOfLines={1}
              >
                {message.subject}
              </Text>
            </View>
            <Text
              variant="labelSmall"
              style={[styles.time, { color: theme.colors.onSurfaceVariant }]}
            >
              {formatSmartTime(message.created_at)}
            </Text>
          </View>

          <Text
            variant="bodySmall"
            style={[styles.sender, { color: theme.colors.onSurfaceVariant }]}
          >
            {message.is_from_staff ? 'From: ' : 'To: '}
            {message.sender?.first_name || ''} {message.sender?.last_name || ''}
          </Text>

          <Text
            variant="bodyMedium"
            style={[styles.preview, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {message.body}
          </Text>

          {message.case && (
            <Text
              variant="labelSmall"
              style={[styles.case, { color: theme.colors.primary }]}
            >
              <MaterialCommunityIcons name="folder" size={12} /> {message.case.case_number}
            </Text>
          )}

          {message.replies && message.replies.length > 0 && (
            <Text
              variant="labelSmall"
              style={[styles.replies, { color: theme.colors.onSurfaceVariant }]}
            >
              <MaterialCommunityIcons name="message-reply" size={12} />{' '}
              {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          )}
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  content: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  subject: {
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  time: {},
  sender: {
    marginTop: 4,
  },
  preview: {
    marginTop: 4,
  },
  case: {
    marginTop: 8,
  },
  replies: {
    marginTop: 4,
  },
});
