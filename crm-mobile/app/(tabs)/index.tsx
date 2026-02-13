import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, useTheme, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore, selectContactName } from '../../src/stores/auth-store';
import { getCases } from '../../src/api/cases';
import { getMessages } from '../../src/api/messages';
import { getAppointments } from '../../src/api/appointments';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { formatDate } from '../../src/utils/date';

export default function HomeScreen() {
  const theme = useTheme();
  const contactName = useAuthStore(selectContactName);

  // Fetch summary data
  const casesQuery = useQuery({
    queryKey: ['cases', 'summary'],
    queryFn: () => getCases({ page: 1 }),
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: () => getMessages({ is_read: false }),
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => getAppointments({ upcoming: true }),
  });

  const isLoading =
    casesQuery.isLoading || messagesQuery.isLoading || appointmentsQuery.isLoading;
  const isRefreshing =
    casesQuery.isFetching || messagesQuery.isFetching || appointmentsQuery.isFetching;

  const handleRefresh = () => {
    casesQuery.refetch();
    messagesQuery.refetch();
    appointmentsQuery.refetch();
  };

  const activeCasesCount =
    casesQuery.data?.results?.filter(
      (c) => {
        const status = c.status?.toLowerCase();
        return status !== 'completed' && status !== 'closed' && status !== 'filed';
      }
    )?.length ?? 0;
  const unreadMessagesCount = messagesQuery.data?.count ?? 0;
  const upcomingAppointmentsCount = appointmentsQuery.data?.count ?? 0;
  const nextAppointment = appointmentsQuery.data?.results?.[0];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing && !isLoading}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text variant="headlineSmall" style={styles.welcomeText}>
            Welcome back,
          </Text>
          <Text variant="headlineMedium" style={styles.nameText}>
            {contactName || 'Client'}
          </Text>
        </View>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <Card
                style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}
                onPress={() => router.push('/(tabs)/cases')}
              >
                <Card.Content style={styles.summaryCardContent}>
                  <MaterialCommunityIcons
                    name="folder-open"
                    size={32}
                    color={theme.colors.primary}
                  />
                  <Text variant="headlineMedium" style={styles.summaryNumber}>
                    {activeCasesCount}
                  </Text>
                  <Text variant="bodySmall">Active Cases</Text>
                </Card.Content>
              </Card>

              <Card
                style={[styles.summaryCard, { backgroundColor: theme.colors.secondaryContainer }]}
                onPress={() => router.push('/(tabs)/messages')}
              >
                <Card.Content style={styles.summaryCardContent}>
                  <MaterialCommunityIcons
                    name="email"
                    size={32}
                    color={theme.colors.secondary}
                  />
                  <Text variant="headlineMedium" style={styles.summaryNumber}>
                    {unreadMessagesCount}
                  </Text>
                  <Text variant="bodySmall">Unread Messages</Text>
                </Card.Content>
              </Card>

              <Card
                style={[styles.summaryCard, { backgroundColor: theme.colors.tertiaryContainer }]}
                onPress={() => router.push('/(tabs)/appointments')}
              >
                <Card.Content style={styles.summaryCardContent}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={32}
                    color={theme.colors.tertiary}
                  />
                  <Text variant="headlineMedium" style={styles.summaryNumber}>
                    {upcomingAppointmentsCount}
                  </Text>
                  <Text variant="bodySmall">Appointments</Text>
                </Card.Content>
              </Card>
            </View>

            {/* Next Appointment */}
            {nextAppointment && (
              <Card style={styles.appointmentCard}>
                <Card.Content>
                  <View style={styles.appointmentHeader}>
                    <MaterialCommunityIcons
                      name="calendar"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text variant="titleMedium" style={styles.appointmentTitle}>
                      Next Appointment
                    </Text>
                  </View>
                  <Text variant="bodyLarge" style={styles.appointmentName}>
                    {nextAppointment.title}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {formatDate(nextAppointment.start_datetime || nextAppointment.start_time)} - {nextAppointment.location}
                  </Text>
                </Card.Content>
              </Card>
            )}

            <Divider style={styles.divider} />

            {/* Quick Actions */}
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Quick Actions
            </Text>
            <View style={styles.actionsRow}>
              <Button
                mode="contained"
                icon="upload"
                onPress={() => router.push('/(tabs)/documents/upload')}
                style={styles.actionButton}
              >
                Upload Document
              </Button>
              <Button
                mode="outlined"
                icon="message-plus"
                onPress={() => router.push('/(tabs)/messages/compose')}
                style={styles.actionButton}
              >
                Send Message
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    opacity: 0.7,
  },
  nameText: {
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
  },
  summaryCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  summaryNumber: {
    fontWeight: '700',
    marginVertical: 8,
  },
  appointmentCard: {
    marginBottom: 24,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  appointmentTitle: {
    fontWeight: '600',
  },
  appointmentName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
