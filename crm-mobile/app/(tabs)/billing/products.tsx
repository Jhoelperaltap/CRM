import { FlatList, StyleSheet, RefreshControl, View } from 'react-native';
import { useTheme, Searchbar, FAB, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { getProducts } from '../../../src/api/billing';
import { ProductCard } from '../../../src/components/billing/ProductCard';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../../../src/components/ui';
import { TenantProduct } from '../../../src/types/billing';

export default function ProductsScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['billing-products', searchQuery],
    queryFn: () => getProducts({ search: searchQuery || undefined }),
  });

  const handleProductPress = useCallback((product: TenantProduct) => {
    // TODO: Navigate to product detail or edit modal
    console.log('Product pressed:', product.id);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  if (isLoading && !searchQuery) {
    return <LoadingSpinner fullScreen message="Loading products..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="Failed to load products"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  const products = data?.results ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search products..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />

      {products.length === 0 ? (
        <EmptyState
          icon="package-variant"
          title="No Products"
          description={
            searchQuery
              ? `No products match "${searchQuery}"`
              : "You haven't added any products yet."
          }
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => handleProductPress(item)} />
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
              {data?.count ?? 0} product{(data?.count ?? 0) !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          router.push('/(tabs)/billing/product/new' as any);
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
