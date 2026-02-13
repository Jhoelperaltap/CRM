import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { Text, Card, Divider, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCase } from '../../../src/api/cases';
import { CaseChecklist } from '../../../src/components/cases/CaseChecklist';
import { StatusBadge, LoadingSpinner, ErrorMessage } from '../../../src/components/ui';
import { formatDate, formatDueDate } from '../../../src/utils/date';

export default function CaseDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: caseItem, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['case', id],
    queryFn: () => getCase(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading case..." />;
  }

  if (error || !caseItem) {
    return (
      <ErrorMessage
        message="Failed to load case details"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  const dueInfo = caseItem.due_date ? formatDueDate(caseItem.due_date) : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Case Header */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text
            variant="labelMedium"
            style={[styles.caseNumber, { color: theme.colors.primary }]}
          >
            {caseItem.case_number}
          </Text>
          <Text variant="headlineSmall" style={styles.title}>
            {caseItem.title}
          </Text>
          <StatusBadge status={caseItem.status} />
        </Card.Content>
      </Card>

      {/* Case Details */}
      <Card style={styles.detailsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Details
          </Text>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="file-document"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <View style={styles.detailContent}>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Case Type
              </Text>
              <Text variant="bodyMedium">{caseItem.case_type}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <View style={styles.detailContent}>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Tax Year
              </Text>
              <Text variant="bodyMedium">{caseItem.tax_year}</Text>
            </View>
          </View>

          {dueInfo && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name={dueInfo.isPast ? 'alert' : 'calendar-clock'}
                size={20}
                color={dueInfo.isUrgent ? theme.colors.error : theme.colors.onSurfaceVariant}
              />
              <View style={styles.detailContent}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Due Date
                </Text>
                <Text
                  variant="bodyMedium"
                  style={dueInfo.isUrgent ? { color: theme.colors.error } : undefined}
                >
                  {dueInfo.text}
                </Text>
              </View>
            </View>
          )}

          {caseItem.assigned_to && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="account"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <View style={styles.detailContent}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Assigned To
                </Text>
                <Text variant="bodyMedium">
                  {caseItem.assigned_to.first_name} {caseItem.assigned_to.last_name}
                </Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Description */}
      {caseItem.description && (
        <Card style={styles.descriptionCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Description
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {caseItem.description}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Checklist */}
      {caseItem.checklist && (
        <Card style={styles.checklistCard}>
          <CaseChecklist checklist={caseItem.checklist} />
        </Card>
      )}

      {/* Timestamps */}
      <View style={styles.timestamps}>
        <Text
          variant="bodySmall"
          style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}
        >
          Created: {formatDate(caseItem.created_at)}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}
        >
          Updated: {formatDate(caseItem.updated_at)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  caseNumber: {
    fontWeight: '600',
    marginBottom: 4,
  },
  title: {
    fontWeight: '600',
    marginBottom: 12,
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  descriptionCard: {
    marginBottom: 16,
  },
  checklistCard: {
    marginBottom: 16,
  },
  timestamps: {
    paddingVertical: 16,
    gap: 4,
  },
  timestamp: {},
});
