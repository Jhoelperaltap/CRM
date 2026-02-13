import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, IconButton, useTheme, Divider } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMessage, markMessageAsRead, replyToMessage } from '../../../src/api/messages';
import { getErrorMessage } from '../../../src/api/client';
import { MessageBubble } from '../../../src/components/messages/MessageBubble';
import { LoadingSpinner, ErrorMessage } from '../../../src/components/ui';
import { PortalMessage } from '../../../src/types/messages';

export default function MessageThreadScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);

  const [replyText, setReplyText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const { data: message, isLoading, error, refetch } = useQuery({
    queryKey: ['message', id],
    queryFn: () => getMessage(id!),
    enabled: !!id,
  });

  // Mark as read when viewing
  useEffect(() => {
    if (message && !message.is_read) {
      markMessageAsRead(id!).then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      });
    }
  }, [message?.id]);

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      replyToMessage(id!, { subject: `Re: ${message?.subject}`, body }),
    onSuccess: () => {
      setReplyText('');
      setSendError(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err) => {
      setSendError(getErrorMessage(err));
    },
  });

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    replyMutation.mutate(replyText.trim());
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading message..." />;
  }

  if (error || !message) {
    return (
      <ErrorMessage
        message="Failed to load message"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  // Combine parent message with replies
  const allMessages: PortalMessage[] = [message, ...(message.replies || [])];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Subject Header */}
      <View style={[styles.subjectHeader, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleMedium" style={styles.subject}>
          {message.subject}
        </Text>
        {message.case && (
          <Text
            variant="bodySmall"
            style={[styles.caseRef, { color: theme.colors.primary }]}
          >
            Case: {message.case.case_number}
          </Text>
        )}
      </View>
      <Divider />

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Reply Input */}
      <View style={[styles.replyContainer, { backgroundColor: theme.colors.surface }]}>
        {sendError && (
          <Text
            variant="bodySmall"
            style={[styles.sendError, { color: theme.colors.error }]}
          >
            {sendError}
          </Text>
        )}
        <View style={styles.replyRow}>
          <TextInput
            mode="outlined"
            placeholder="Type your reply..."
            value={replyText}
            onChangeText={setReplyText}
            multiline
            style={styles.replyInput}
            dense
          />
          <IconButton
            icon="send"
            mode="contained"
            onPress={handleSendReply}
            disabled={!replyText.trim() || replyMutation.isPending}
            loading={replyMutation.isPending}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subjectHeader: {
    padding: 16,
  },
  subject: {
    fontWeight: '600',
  },
  caseRef: {
    marginTop: 4,
  },
  messagesList: {
    paddingVertical: 16,
  },
  replyContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sendError: {
    marginBottom: 8,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    maxHeight: 100,
  },
});
