import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAppointments } from '../../src/api/appointments';
import { LoadingSpinner, EmptyState, ErrorMessage, StatusBadge } from '../../src/components/ui';
import { formatDate, formatTimeRange } from '../../src/utils/date';
import { PortalAppointment } from '../../src/types/appointments';

function AppointmentCard({ appointment }: { appointment: PortalAppointment }) {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            {appointment.title}
          </Text>
          <StatusBadge status={appointment.status} size="small" />
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons
            name="calendar"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatDate(appointment.start_datetime || appointment.start_time)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatTimeRange(appointment.start_datetime || appointment.start_time, appointment.end_datetime || appointment.end_time)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons
            name={appointment.is_virtual ? 'video' : 'map-marker'}
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {appointment.is_virtual ? 'Virtual Meeting' : appointment.location}
          </Text>
        </View>

        {(appointment.assigned_to || appointment.assigned_to_name) && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="account"
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {appointment.assigned_to_name ||
               (appointment.assigned_to && `${appointment.assigned_to.first_name} ${appointment.assigned_to.last_name}`)}
            </Text>
          </View>
        )}

        {appointment.case && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="folder"
              size={18}
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
              {appointment.case.case_number}
            </Text>
          </View>
        )}

        {appointment.description && (
          <Text
            variant="bodySmall"
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {appointment.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

export default function AppointmentsScreen() {
  const theme = useTheme();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => getAppointments({ upcoming: true }),
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading appointments..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load appointments"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  if (!data?.results?.length) {
    return (
      <EmptyState
        icon="calendar-blank"
        title="No Appointments"
        description="You don't have any upcoming appointments."
      />
    );
  }

  return (
    <FlatList
      data={data.results ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AppointmentCard appointment={item} />}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          colors={[theme.colors.primary]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  description: {
    marginTop: 8,
    fontStyle: 'italic',
  },
});
