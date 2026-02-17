import React from 'react';
import { StyleSheet, Pressable, View, useColorScheme } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortalDocument, DOCUMENT_TYPE_LABELS } from '../../types/documents';
import { StatusBadge } from '../ui/StatusBadge';
import { formatSmartTime } from '../../utils/date';
import { iconColors, darkIconColors } from '../../constants/colors';

interface DocumentCardProps {
  document: PortalDocument;
  onPress?: () => void;
}

type DocIconType = 'pdf' | 'image' | 'word' | 'excel' | 'text' | 'generic';

// Get icon and color based on document type or mime type
function getDocumentIconInfo(doc: PortalDocument): { icon: keyof typeof MaterialCommunityIcons.glyphMap; type: DocIconType } {
  const mime = doc.mime_type?.toLowerCase() || '';

  if (mime.includes('pdf')) return { icon: 'file-pdf-box', type: 'pdf' };
  if (mime.includes('image')) return { icon: 'file-image', type: 'image' };
  if (mime.includes('word') || mime.includes('document')) return { icon: 'file-word', type: 'word' };
  if (mime.includes('excel') || mime.includes('spreadsheet')) return { icon: 'file-excel', type: 'excel' };
  if (mime.includes('text')) return { icon: 'file-document-outline', type: 'text' };

  return { icon: 'file-outline', type: 'generic' };
}

// Background colors for icon circles
const iconBackgrounds: Record<DocIconType, string> = {
  pdf: '#FFEBEE',
  image: '#E8F5E9',
  word: '#E3F2FD',
  excel: '#E8F5E9',
  text: '#F5F5F5',
  generic: '#ECEFF1',
};

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
  const colorScheme = useColorScheme();
  const icons = colorScheme === 'dark' ? darkIconColors : iconColors;
  const { icon, type } = getDocumentIconInfo(document);
  const iconColor = icons[type];
  const bgColor = iconBackgrounds[type];

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
            <MaterialCommunityIcons
              name={icon}
              size={32}
              color={iconColor}
            />
          </View>

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
    borderRadius: 12,
  },
  content: {
    gap: 6,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
