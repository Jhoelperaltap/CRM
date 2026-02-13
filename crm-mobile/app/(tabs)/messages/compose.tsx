import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../../../src/api/messages';
import { getCases } from '../../../src/api/cases';
import { getErrorMessage } from '../../../src/api/client';

export default function ComposeMessageScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch cases for selection
  const casesQuery = useQuery({
    queryKey: ['cases'],
    queryFn: () => getCases(),
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      router.back();
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const handleSend = () => {
    setError(null);

    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    if (!body.trim()) {
      setError('Please enter a message');
      return;
    }

    sendMutation.mutate({
      subject: subject.trim(),
      body: body.trim(),
      case_id: selectedCase || undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Subject */}
        <TextInput
          mode="outlined"
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
        />

        {/* Message Body */}
        <TextInput
          mode="outlined"
          label="Message"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={8}
          style={[styles.input, styles.messageInput]}
        />

        {/* Case Selection */}
        {casesQuery.data?.results && casesQuery.data.results.length > 0 && (
          <>
            <Text variant="labelLarge" style={styles.label}>
              Related Case (optional)
            </Text>
            <View style={styles.caseButtons}>
              <Button
                mode={selectedCase === null ? 'contained' : 'outlined'}
                onPress={() => setSelectedCase(null)}
                compact
                style={styles.caseButton}
              >
                None
              </Button>
              {casesQuery.data.results.slice(0, 5).map((caseItem) => (
                <Button
                  key={caseItem.id}
                  mode={selectedCase === caseItem.id ? 'contained' : 'outlined'}
                  onPress={() => setSelectedCase(caseItem.id)}
                  compact
                  style={styles.caseButton}
                >
                  {caseItem.case_number}
                </Button>
              ))}
            </View>
          </>
        )}

        {/* Error Message */}
        {error && (
          <HelperText type="error" visible={true} style={styles.error}>
            {error}
          </HelperText>
        )}

        {/* Send Button */}
        <Button
          mode="contained"
          onPress={handleSend}
          loading={sendMutation.isPending}
          disabled={sendMutation.isPending}
          style={styles.sendButton}
          contentStyle={styles.sendButtonContent}
          icon="send"
        >
          Send Message
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  messageInput: {
    minHeight: 150,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  caseButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  caseButton: {
    marginBottom: 4,
  },
  error: {
    marginBottom: 8,
  },
  sendButton: {
    marginTop: 16,
  },
  sendButtonContent: {
    paddingVertical: 8,
  },
});
