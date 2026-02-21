import { FlatList, StyleSheet, RefreshControl, View } from 'react-native';
import { useTheme, Searchbar, FAB, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { getServices } from '../../../src/api/billing';
import { ServiceCard } from '../../../src/components/billing/ServiceCard';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../../src/components/ui';
import { TenantService } from '../../../src/types/billing';

export default function ServicesScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['billing-services', searchQuery],
    queryFn: () => getServices({ search: searchQuery || undefined }),
  });

  const handleServicePress = useCallback((service: TenantService) => {
    // TODO: Navigate to service detail or edit modal
    console.log('Service pressed:', service.id);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  if (isLoading && !searchQuery) {
    return <LoadingSpinner fullScreen message="Loading services..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load services"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  const services = data?.results ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search services..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />

      {services.length === 0 ? (
        <EmptyState
          icon="cog"
          title="No Services"
          description={
            searchQuery
              ? `No services match "${searchQuery}"`
              : "You haven't added any services yet."
          }
        />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceCard service={item} onPress={() => handleServicePress(item)} />
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
              {data?.count ?? 0} service{(data?.count ?? 0) !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          router.push('/(tabs)/billing/service/new' as any);
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
