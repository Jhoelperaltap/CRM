import { FlatList, StyleSheet, RefreshControl, View } from 'react-native';
import { useTheme, Searchbar, FAB, Text, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { getQuotes } from '../../../src/api/billing';
import { QuoteCard } from '../../../src/components/billing/QuoteCard';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../../src/components/ui';
import { TenantQuote } from '../../../src/types/billing';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

export default function QuotesScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['billing-quotes', searchQuery, statusFilter],
    queryFn: () => getQuotes({
      search: searchQuery || undefined,
      status: statusFilter || undefined,
    }),
  });

  const handleQuotePress = useCallback((quote: TenantQuote) => {
    router.push({
      pathname: '/(tabs)/billing/quote/[id]' as any,
      params: { id: quote.id },
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  if (isLoading && !searchQuery && !statusFilter) {
    return <LoadingSpinner fullScreen message="Loading quotes..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load quotes"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  const quotes = data?.results ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search quotes..."
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

      {quotes.length === 0 ? (
        <EmptyState
          icon="file-document-edit-outline"
          title="No Quotes"
          description={
            searchQuery || statusFilter
              ? 'No quotes match your filters'
              : "You haven't created any quotes yet."
          }
        />
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QuoteCard quote={item} onPress={() => handleQuotePress(item)} />
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
              {data?.count ?? 0} quote{(data?.count ?? 0) !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          // TODO: Navigate to create quote screen
          console.log('Create quote');
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
