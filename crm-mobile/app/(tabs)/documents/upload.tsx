import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  HelperText,
  SegmentedButtons,
  Card,
} from 'react-native-paper';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { uploadDocument } from '../../../src/api/documents';
import { getCases } from '../../../src/api/cases';
import { getErrorMessage } from '../../../src/api/client';
import { DocumentType, DOCUMENT_TYPE_LABELS } from '../../../src/types/documents';

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export default function UploadDocumentScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState<DocumentType>('other');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch cases for selection
  const casesQuery = useQuery({
    queryKey: ['cases'],
    queryFn: () => getCases(),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      router.back();
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        });

        // Auto-fill title if empty
        if (!title) {
          setTitle(asset.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err) {
      setError('Failed to pick document');
    }
  };

  const handleUpload = () => {
    setError(null);

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    uploadMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      doc_type: docType,
      case_id: selectedCase || undefined,
      file: {
        uri: file.uri,
        name: file.name,
        type: file.type,
      },
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
        {/* File Picker */}
        <Card
          style={[styles.fileCard, { borderColor: theme.colors.outline }]}
          mode="outlined"
          onPress={handlePickDocument}
        >
          <Card.Content style={styles.fileCardContent}>
            {file ? (
              <>
                <MaterialCommunityIcons
                  name="file-check"
                  size={48}
                  color={theme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.fileName} numberOfLines={2}>
                  {file.name}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formatFileSize(file.size)}
                </Text>
                <Button mode="text" onPress={handlePickDocument}>
                  Change File
                </Button>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="cloud-upload"
                  size={48}
                  color={theme.colors.outline}
                />
                <Text variant="titleMedium" style={styles.uploadPrompt}>
                  Tap to select a file
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  PDF, Images, or Word documents
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Title */}
        <TextInput
          mode="outlined"
          label="Document Title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        {/* Description */}
        <TextInput
          mode="outlined"
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        {/* Document Type */}
        <Text variant="labelLarge" style={styles.label}>
          Document Type
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <SegmentedButtons
            value={docType}
            onValueChange={(value) => setDocType(value as DocumentType)}
            buttons={[
              { value: 'w2', label: 'W-2' },
              { value: '1099', label: '1099' },
              { value: 'id', label: 'ID' },
              { value: 'tax_return', label: 'Tax Return' },
              { value: 'bank_statement', label: 'Bank' },
              { value: 'other', label: 'Other' },
            ]}
            style={styles.segmentedButtons}
          />
        </ScrollView>

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

        {/* Upload Button */}
        <Button
          mode="contained"
          onPress={handleUpload}
          loading={uploadMutation.isPending}
          disabled={uploadMutation.isPending || !file}
          style={styles.uploadButton}
          contentStyle={styles.uploadButtonContent}
          icon="upload"
        >
          Upload Document
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
  fileCard: {
    marginBottom: 24,
  },
  fileCardContent: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  fileName: {
    textAlign: 'center',
    marginTop: 8,
  },
  uploadPrompt: {
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
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
  uploadButton: {
    marginTop: 16,
  },
  uploadButtonContent: {
    paddingVertical: 8,
  },
});
