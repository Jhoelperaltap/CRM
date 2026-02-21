import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TenantInvoice, INVOICE_STATUS_LABELS } from '../../types/billing';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDate, formatDueDate } from '../../utils/date';

interface InvoiceCardProps {
  invoice: TenantInvoice;
  onPress: () => void;
}

export function InvoiceCard({ invoice, onPress }: InvoiceCardProps) {
  const theme = useTheme();
  const dueInfo = invoice.due_date ? formatDueDate(invoice.due_date) : null;
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] || invoice.status;

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
            style={[styles.invoiceNumber, { color: theme.colors.primary }]}
          >
            {invoice.invoice_number}
          </Text>

          <Text variant="titleMedium" style={styles.subject} numberOfLines={2}>
            {invoice.subject}
          </Text>

          <Text
            variant="bodySmall"
            style={[styles.customer, { color: theme.colors.onSurfaceVariant }]}
          >
            <MaterialCommunityIcons name="account" size={12} /> {invoice.customer_name}
          </Text>

          <StatusBadge status={invoice.status} label={statusLabel} size="small" />

          <Text
            variant="titleMedium"
            style={[styles.total, { color: theme.colors.primary }]}
          >
            {formatCurrency(invoice.total)}
          </Text>

          {dueInfo && invoice.status !== 'paid' && (
            <Text
              variant="bodySmall"
              style={[
                styles.dueDate,
                { color: dueInfo.isUrgent ? theme.colors.error : theme.colors.onSurfaceVariant },
              ]}
            >
              <MaterialCommunityIcons
                name={dueInfo.isPast ? 'alert' : 'calendar'}
                size={12}
              />{' '}
              {dueInfo.text}
            </Text>
          )}

          <Text
            variant="bodySmall"
            style={[styles.date, { color: theme.colors.onSurfaceVariant }]}
          >
            {formatDate(invoice.invoice_date)}
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
  invoiceNumber: {
    fontWeight: '600',
  },
  subject: {
    fontWeight: '600',
  },
  customer: {},
  total: {
    fontWeight: '700',
  },
  dueDate: {
    marginTop: 4,
  },
  date: {
    marginTop: 4,
  },
});
