import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortalCase } from '../../types/cases';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDate, formatDueDate } from '../../utils/date';

interface CaseCardProps {
  caseItem: PortalCase;
  onPress: () => void;
}

export function CaseCard({ caseItem, onPress }: CaseCardProps) {
  const theme = useTheme();
  const dueInfo = caseItem.due_date ? formatDueDate(caseItem.due_date) : null;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          <Text
            variant="labelSmall"
            style={[styles.caseNumber, { color: theme.colors.primary }]}
          >
            {caseItem.case_number}
          </Text>

          <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
            {caseItem.title}
          </Text>

          <Text
            variant="bodySmall"
            style={[styles.type, { color: theme.colors.onSurfaceVariant }]}
          >
            {caseItem.case_type} - Tax Year {caseItem.tax_year}
          </Text>

          <StatusBadge status={caseItem.status} size="small" />

          {dueInfo && (
            <Text
              variant="bodySmall"
              style={[
                styles.dueDate,
                { color: dueInfo.isUrgent ? theme.colors.error : theme.colors.onSurfaceVariant },
              ]}
            >
              <MaterialCommunityIcons
                name={dueInfo.isPast ? 'alert' : 'calendar'}
                size={12}
              />{' '}
              {dueInfo.text}
            </Text>
          )}

          {caseItem.checklist && (
            <Text
              variant="bodySmall"
              style={[styles.progress, { color: theme.colors.onSurfaceVariant }]}
            >
              <MaterialCommunityIcons name="checkbox-marked-outline" size={12} />{' '}
              {caseItem.checklist.progress}% complete
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
    gap: 8,
  },
  caseNumber: {
    fontWeight: '600',
  },
  title: {
    fontWeight: '600',
  },
  type: {},
  dueDate: {
    marginTop: 4,
  },
  progress: {
    marginTop: 4,
  },
});
