import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TenantQuote, QUOTE_STATUS_LABELS } from '../../types/billing';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDate, formatDueDate } from '../../utils/date';

interface QuoteCardProps {
  quote: TenantQuote;
  onPress: () => void;
}

export function QuoteCard({ quote, onPress }: QuoteCardProps) {
  const theme = useTheme();
  const validInfo = quote.valid_until ? formatDueDate(quote.valid_until) : null;
  const statusLabel = QUOTE_STATUS_LABELS[quote.status] || quote.status;

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          <Text
            variant="labelSmall"
            style={[styles.quoteNumber, { color: theme.colors.primary }]}
          >
            {quote.quote_number}
          </Text>

          <Text variant="titleMedium" style={styles.subject} numberOfLines={2}>
            {quote.subject}
          </Text>

          <Text
            variant="bodySmall"
            style={[styles.customer, { color: theme.colors.onSurfaceVariant }]}
          >
            <MaterialCommunityIcons name="account" size={12} /> {quote.customer_name}
          </Text>

          <StatusBadge status={quote.status} label={statusLabel} size="small" />

          <Text
            variant="titleMedium"
            style={[styles.total, { color: theme.colors.primary }]}
          >
            {formatCurrency(quote.total)}
          </Text>

          {validInfo && quote.status === 'sent' && (
            <Text
              variant="bodySmall"
              style={[
                styles.validUntil,
                { color: validInfo.isUrgent ? theme.colors.error : theme.colors.onSurfaceVariant },
              ]}
            >
              <MaterialCommunityIcons
                name={validInfo.isPast ? 'alert' : 'clock-outline'}
                size={12}
              />{' '}
              Valid {validInfo.text.toLowerCase()}
            </Text>
          )}

          <Text
            variant="bodySmall"
            style={[styles.date, { color: theme.colors.onSurfaceVariant }]}
          >
            {formatDate(quote.quote_date)}
          </Text>
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
  quoteNumber: {
    fontWeight: '600',
  },
  subject: {
    fontWeight: '600',
  },
  customer: {},
  total: {
    fontWeight: '700',
  },
  validUntil: {
    marginTop: 4,
  },
  date: {
    marginTop: 4,
  },
});
