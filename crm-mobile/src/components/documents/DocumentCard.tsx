import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortalDocument, DOCUMENT_TYPE_LABELS } from '../../types/documents';
import { StatusBadge } from '../ui/StatusBadge';
import { formatSmartTime } from '../../utils/date';

interface DocumentCardProps {
  document: PortalDocument;
  onPress?: () => void;
}

// Get icon based on document type or mime type
function getDocumentIcon(doc: PortalDocument): keyof typeof MaterialCommunityIcons.glyphMap {
  const mime = doc.mime_type?.toLowerCase() || '';

  if (mime.includes('pdf')) return 'file-pdf-box';
  if (mime.includes('image')) return 'file-image';
  if (mime.includes('word') || mime.includes('document')) return 'file-word';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'file-excel';
  if (mime.includes('text')) return 'file-document-outline';

  return 'file-outline';
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DocumentCard({ document, onPress }: DocumentCardProps) {
  const theme = useTheme();
  const icon = getDocumentIcon(document);

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          <MaterialCommunityIcons
            name={icon}
            size={40}
            color={theme.colors.primary}
            style={styles.icon}
          />

          <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
            {document.title}
          </Text>

          <Text
            variant="bodySmall"
            style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
          >
            {DOCUMENT_TYPE_LABELS[document.doc_type || 'other'] || 'Document'}
            {document.file_size ? ` - ${formatFileSize(document.file_size)}` : ''}
          </Text>

          {document.status && <StatusBadge status={document.status} size="small" />}

          {document.rejection_reason && (
            <Text
              variant="bodySmall"
              style={[styles.rejection, { color: theme.colors.error }]}
              numberOfLines={2}
            >
              {document.rejection_reason}
            </Text>
          )}

          <Text
            variant="bodySmall"
            style={[styles.date, { color: theme.colors.onSurfaceVariant }]}
          >
            Uploaded {formatSmartTime(document.created_at)}
          </Text>

          {(document.case?.case_number || document.case_number) && (
            <Text
              variant="bodySmall"
              style={[styles.case, { color: theme.colors.primary }]}
            >
              <MaterialCommunityIcons name="folder" size={12} /> {document.case?.case_number || document.case_number}
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
    gap: 6,
  },
  icon: {
    marginBottom: 4,
  },
  title: {
    fontWeight: '600',
  },
  meta: {},
  rejection: {
    marginTop: 4,
  },
  date: {
    marginTop: 4,
  },
  case: {
    marginTop: 4,
  },
});
