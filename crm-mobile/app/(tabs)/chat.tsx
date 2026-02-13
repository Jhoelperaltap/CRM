import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text, useTheme, Surface, IconButton, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { startChat, sendMessage } from '../../src/api/chat';
import { ChatMessage, ChatMessageResponse } from '../../src/types/chat';
import { formatSmartTime } from '../../src/utils/date';

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize chat
  useEffect(() => {
    const initChat = async () => {
      try {
        const response = await startChat();
        setConversationId(response.conversation_id);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: response.message,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        console.error('Failed to start chat:', error);
        setMessages([
          {
            id: 'error',
            role: 'assistant',
            content: 'Sorry, the chat service is temporarily unavailable. Please try again later.',
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsInitializing(false);
      }
    };

    initChat();
  }, []);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (message: string) => sendMessage(message, conversationId || undefined),
    onSuccess: (response: ChatMessageResponse) => {
      setConversationId(response.conversation_id);

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        metadata: response.metadata,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: () => {
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = useCallback(() => {
    if (!inputText.trim() || sendMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    sendMutation.mutate(inputText.trim());
    setInputText('');
  }, [inputText, sendMutation]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {!isUser && (
          <Avatar.Icon
            size={32}
            icon="robot"
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          />
        )}
        <Surface
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.surfaceVariant },
          ]}
          elevation={1}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? theme.colors.onPrimary : theme.colors.onSurface },
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              {
                color: isUser
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant,
                opacity: 0.7,
              },
            ]}
          >
            {formatSmartTime(item.created_at)}
          </Text>
        </Surface>
        {isUser && (
          <Avatar.Icon
            size={32}
            icon="account"
            style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}
          />
        )}
      </View>
    );
  };

  if (isInitializing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        {/* Header with back button during loading */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline },
          ]}
        >
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Avatar.Icon
            size={40}
            icon="robot"
            style={{ backgroundColor: theme.colors.primary }}
          />
          <View style={styles.headerText}>
            <Text variant="titleMedium">Ebenezer Assistant</Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Connecting...
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Starting chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline },
          ]}
        >
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Avatar.Icon
            size={40}
            icon="robot"
            style={{ backgroundColor: theme.colors.primary }}
          />
          <View style={styles.headerText}>
            <Text variant="titleMedium">Ebenezer Assistant</Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Ask me anything about our services
            </Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing indicator */}
        {sendMutation.isPending && (
          <View style={styles.typingContainer}>
            <Avatar.Icon
              size={24}
              icon="robot"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.typingDots}>
              <View
                style={[styles.dot, { backgroundColor: theme.colors.primary }]}
              />
              <View
                style={[styles.dot, { backgroundColor: theme.colors.primary }]}
              />
              <View
                style={[styles.dot, { backgroundColor: theme.colors.primary }]}
              />
            </View>
          </View>
        )}

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceVariant,
                color: theme.colors.onSurface,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <IconButton
            icon="send"
            mode="contained"
            iconColor={theme.colors.onPrimary}
            containerColor={theme.colors.primary}
            size={24}
            onPress={handleSend}
            disabled={!inputText.trim() || sendMutation.isPending}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={[
              styles.quickAction,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
            onPress={() => setInputText('I would like to schedule an appointment')}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={16}
              color={theme.colors.onSecondaryContainer}
            />
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSecondaryContainer }}
            >
              Book Appointment
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.quickAction,
              { backgroundColor: theme.colors.tertiaryContainer },
            ]}
            onPress={() => setInputText('What services do you offer?')}
          >
            <MaterialCommunityIcons
              name="help-circle"
              size={16}
              color={theme.colors.onTertiaryContainer}
            />
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onTertiaryContainer }}
            >
              Services
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.quickAction,
              { backgroundColor: theme.colors.errorContainer },
            ]}
            onPress={() => setInputText('I need to speak with a representative')}
          >
            <MaterialCommunityIcons
              name="account-voice"
              size={16}
              color={theme.colors.onErrorContainer}
            />
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onErrorContainer }}
            >
              Human Help
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 4,
    borderBottomWidth: 1,
    gap: 8,
  },
  backButton: {
    margin: 0,
  },
  headerText: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
});
