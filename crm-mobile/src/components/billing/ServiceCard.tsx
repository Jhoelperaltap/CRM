import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TenantService } from '../../types/billing';

interface ServiceCardProps {
  service: TenantService;
  onPress: () => void;
}

export function ServiceCard({ service, onPress }: ServiceCardProps) {
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
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name="cog"
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text
                variant="labelSmall"
                style={[styles.serviceCode, { color: theme.colors.primary }]}
              >
                {service.service_code}
              </Text>
              <Text variant="titleMedium" style={styles.name} numberOfLines={2}>
                {service.name}
              </Text>
            </View>
          </View>

          {service.category && (
            <Chip
              style={styles.category}
              textStyle={styles.categoryText}
              compact
            >
              {service.category}
            </Chip>
          )}

          {service.description && (
            <Text
              variant="bodySmall"
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={2}
            >
              {service.description}
            </Text>
          )}

          <View style={styles.details}>
            <Text
              variant="titleMedium"
              style={[styles.price, { color: theme.colors.primary }]}
            >
              {formatCurrency(service.unit_price)}
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {' '}/ {service.usage_unit}
              </Text>
            </Text>
          </View>

          {!service.is_active && (
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
  iconContainer: {
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
  serviceCode: {
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
  description: {},
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontWeight: '700',
  },
  inactive: {
    marginTop: 4,
  },
});
