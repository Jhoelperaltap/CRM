import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { PortalMessage } from '../../types/messages';
import { formatSmartTime } from '../../utils/date';

interface MessageBubbleProps {
  message: PortalMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const theme = useTheme();
  const isStaff = message.is_from_staff;

  return (
    <View style={[styles.container, isStaff ? styles.staffContainer : styles.clientContainer]}>
      <View
        style={[
          styles.bubble,
          isStaff
            ? [styles.staffBubble, { backgroundColor: theme.colors.surfaceVariant }]
            : [styles.clientBubble, { backgroundColor: theme.colors.primaryContainer }],
        ]}
      >
        <Text
          variant="labelSmall"
          style={[
            styles.sender,
            { color: isStaff ? theme.colors.onSurfaceVariant : theme.colors.primary },
          ]}
        >
          {message.sender?.first_name || ''} {message.sender?.last_name || ''}
        </Text>

        <Text
          variant="bodyMedium"
          style={[
            styles.body,
            { color: isStaff ? theme.colors.onSurface : theme.colors.onPrimaryContainer },
          ]}
        >
          {message.body}
        </Text>

        <Text
          variant="labelSmall"
          style={[
            styles.time,
            { color: isStaff ? theme.colors.onSurfaceVariant : theme.colors.onPrimaryContainer },
          ]}
        >
          {formatSmartTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    maxWidth: '85%',
  },
  staffContainer: {
    alignSelf: 'flex-start',
  },
  clientContainer: {
    alignSelf: 'flex-end',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
  },
  staffBubble: {
    borderBottomLeftRadius: 4,
  },
  clientBubble: {
    borderBottomRightRadius: 4,
  },
  sender: {
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    lineHeight: 20,
  },
  time: {
    marginTop: 8,
    textAlign: 'right',
    opacity: 0.7,
  },
});
