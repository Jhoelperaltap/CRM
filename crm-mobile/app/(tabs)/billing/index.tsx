import { StyleSheet, ScrollView, View, RefreshControl, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getBillingDashboard } from '../../../src/api/billing';
import { LoadingSpinner, ErrorMessage } from '../../../src/components/ui';

export default function BillingDashboardScreen() {
  const theme = useTheme();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['billing-dashboard'],
    queryFn: getBillingDashboard,
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading billing dashboard..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load billing dashboard"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  const menuItems = [
    {
      title: 'Products',
      subtitle: `${data?.products_count || 0} items`,
      icon: 'package-variant',
      color: '#4CAF50',
      route: '/(tabs)/billing/products',
    },
    {
      title: 'Services',
      subtitle: `${data?.services_count || 0} items`,
      icon: 'cog',
      color: '#2196F3',
      route: '/(tabs)/billing/services',
    },
    {
      title: 'Invoices',
      subtitle: `${data?.pending_invoices_count || 0} pending`,
      icon: 'file-document',
      color: '#FF9800',
      route: '/(tabs)/billing/invoices',
    },
    {
      title: 'Quotes',
      subtitle: 'View all',
      icon: 'file-document-edit',
      color: '#9C27B0',
      route: '/(tabs)/billing/quotes',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Tenant Header */}
      {data?.tenant && (
        <Card style={styles.tenantCard} mode="elevated">
          <Card.Content style={styles.tenantContent}>
            <MaterialCommunityIcons
              name="domain"
              size={32}
              color={theme.colors.primary}
            />
            <Text variant="titleLarge" style={styles.tenantName}>
              {data.tenant.name}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <Card style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: '#1565C0' }}>
              Total Revenue
            </Text>
            <Text variant="headlineSmall" style={[styles.statValue, { color: '#1565C0' }]}>
              {formatCurrency(data?.total_revenue || '0')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: '#E65100' }}>
              Pending Amount
            </Text>
            <Text variant="headlineSmall" style={[styles.statValue, { color: '#E65100' }]}>
              {formatCurrency(data?.pending_invoices_amount || '0')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: '#2E7D32' }}>
              This Month
            </Text>
            <Text variant="headlineSmall" style={[styles.statValue, { color: '#2E7D32' }]}>
              {formatCurrency(data?.revenue_this_month || '0')}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: '#C2185B' }}>
              Pending Invoices
            </Text>
            <Text variant="headlineSmall" style={[styles.statValue, { color: '#C2185B' }]}>
              {data?.pending_invoices_count || 0}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Quick Actions Menu */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Quick Actions
      </Text>

      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <Pressable
            key={item.title}
            onPress={() => router.push(item.route as any)}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
          >
            <Card style={styles.menuCard} mode="elevated">
              <Card.Content style={styles.menuContent}>
                <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={28}
                    color={item.color}
                  />
                </View>
                <Text variant="titleSmall" style={styles.menuTitle}>
                  {item.title}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.menuSubtitle, { color: theme.colors.onSurfaceVariant }]}
                >
                  {item.subtitle}
                </Text>
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  tenantCard: {
    marginBottom: 16,
  },
  tenantContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tenantName: {
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
  },
  statValue: {
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: {
    width: '48%',
    flexGrow: 1,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuCard: {},
  menuContent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  menuSubtitle: {
    textAlign: 'center',
  },
});
