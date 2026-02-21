import React from 'react';
import { StyleSheet, Pressable, View, Image } from 'react-native';
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TenantProduct } from '../../types/billing';

interface ProductCardProps {
  product: TenantProduct;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const theme = useTheme();

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.image} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            )}
            <View style={styles.headerText}>
              <Text
                variant="labelSmall"
                style={[styles.productCode, { color: theme.colors.primary }]}
              >
                {product.product_code}
              </Text>
              <Text variant="titleMedium" style={styles.name} numberOfLines={2}>
                {product.name}
              </Text>
            </View>
          </View>

          {product.category && (
            <Chip
              style={styles.category}
              textStyle={styles.categoryText}
              compact
            >
              {product.category}
            </Chip>
          )}

          <View style={styles.details}>
            <Text
              variant="titleMedium"
              style={[styles.price, { color: theme.colors.primary }]}
            >
              {formatCurrency(product.unit_price)}
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {' '}/ {product.unit}
              </Text>
            </Text>

            <Text
              variant="bodySmall"
              style={[
                styles.stock,
                {
                  color: product.qty_in_stock > 0
                    ? theme.colors.onSurfaceVariant
                    : theme.colors.error,
                },
              ]}
            >
              <MaterialCommunityIcons name="package-variant-closed" size={12} />{' '}
              {product.qty_in_stock > 0 ? `${product.qty_in_stock} in stock` : 'Out of stock'}
            </Text>
          </View>

          {!product.is_active && (
            <Text
              variant="bodySmall"
              style={[styles.inactive, { color: theme.colors.error }]}
            >
              <MaterialCommunityIcons name="alert-circle" size={12} /> Inactive
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
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  productCode: {
    fontWeight: '600',
  },
  name: {
    fontWeight: '600',
  },
  category: {
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 11,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontWeight: '700',
  },
  stock: {},
  inactive: {
    marginTop: 4,
  },
});
