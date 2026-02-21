import { FlatList, StyleSheet, RefreshControl, View } from 'react-native';
import { useTheme, Searchbar, FAB, Text, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { getInvoices } from '../../../src/api/billing';
import { InvoiceCard } from '../../../src/components/billing/InvoiceCard';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../../src/components/ui';
import { TenantInvoice } from '../../../src/types/billing';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

export default function InvoicesScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['billing-invoices', searchQuery, statusFilter],
    queryFn: () => getInvoices({
      search: searchQuery || undefined,
      status: statusFilter || undefined,
    }),
  });

  const handleInvoicePress = useCallback((invoice: TenantInvoice) => {
    router.push({
      pathname: '/(tabs)/billing/invoice/[id]' as any,
      params: { id: invoice.id },
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  if (isLoading && !searchQuery && !statusFilter) {
    return <LoadingSpinner fullScreen message="Loading invoices..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load invoices"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  const invoices = data?.results ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search invoices..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />

      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          buttons={STATUS_FILTERS}
          style={styles.segmentedButtons}
          density="small"
        />
      </View>

      {invoices.length === 0 ? (
        <EmptyState
          icon="file-document-outline"
          title="No Invoices"
          description={
            searchQuery || statusFilter
              ? 'No invoices match your filters'
              : "You haven't created any invoices yet."
          }
        />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InvoiceCard invoice={item} onPress={() => handleInvoicePress(item)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              colors={[theme.colors.primary]}
            />
          }
          ListHeaderComponent={
            <Text
              variant="bodySmall"
              style={[styles.count, { color: theme.colors.onSurfaceVariant }]}
            >
              {data?.count ?? 0} invoice{(data?.count ?? 0) !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          // TODO: Navigate to create invoice screen
          console.log('Create invoice');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  searchInput: {
    minHeight: 0,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {},
  list: {
    paddingBottom: 80,
  },
  count: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
