import { StyleSheet, ScrollView, View, Alert, Linking } from 'react-native';
import { useTheme, Card, Text, Button, Divider, DataTable } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getInvoice, sendInvoice, markInvoicePaid, getInvoicePdfUrl } from '../../../../src/api/billing';
import { LoadingSpinner, ErrorMessage } from '../../../../src/components/ui';
import { StatusBadge } from '../../../../src/components/ui/StatusBadge';
import { INVOICE_STATUS_LABELS } from '../../../../src/types/billing';
import { formatDate } from '../../../../src/utils/date';

export default function InvoiceDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, error, refetch } = useQuery({
    queryKey: ['billing-invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendInvoice(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      Alert.alert('Success', 'Invoice sent successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to send invoice');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: () => markInvoicePaid(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
      Alert.alert('Success', 'Invoice marked as paid');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to mark invoice as paid');
    },
  });

  const handleDownloadPdf = async () => {
    try {
      const pdfUrl = await getInvoicePdfUrl(id!);
      await Linking.openURL(pdfUrl);
    } catch {
      Alert.alert('Error', 'Failed to download PDF');
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading invoice..." />;
  }

  if (error || !invoice) {
    return (
      <ErrorMessage
        message="Failed to load invoice"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] || invoice.status;
  const canSend = invoice.status === 'draft';
  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'overdue';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.headerRow}>
            <Text variant="headlineSmall" style={styles.invoiceNumber}>
              {invoice.invoice_number}
            </Text>
            <StatusBadge status={invoice.status} label={statusLabel} />
          </View>

          <Text variant="titleMedium" style={styles.subject}>
            {invoice.subject}
          </Text>

          <View style={styles.dateRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              <MaterialCommunityIcons name="calendar" size={12} /> Date: {formatDate(invoice.invoice_date)}
            </Text>
            {invoice.due_date && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                <MaterialCommunityIcons name="calendar-clock" size={12} /> Due: {formatDate(invoice.due_date)}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Customer Info */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            <MaterialCommunityIcons name="account" size={16} /> Customer
          </Text>
          <Text variant="bodyMedium" style={styles.customerName}>
            {invoice.customer_name}
          </Text>
          {invoice.customer_email && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {invoice.customer_email}
            </Text>
          )}
          {invoice.customer_phone && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {invoice.customer_phone}
            </Text>
          )}
          {invoice.customer_address && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {invoice.customer_address}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Line Items */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            <MaterialCommunityIcons name="format-list-bulleted" size={16} /> Items
          </Text>

          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>Description</DataTable.Title>
              <DataTable.Title numeric>Qty</DataTable.Title>
              <DataTable.Title numeric>Price</DataTable.Title>
              <DataTable.Title numeric>Total</DataTable.Title>
            </DataTable.Header>

            {invoice.line_items.map((item, index) => (
              <DataTable.Row key={item.id || index}>
                <DataTable.Cell style={{ flex: 2 }}>
                  <Text numberOfLines={2} variant="bodySmall">
                    {item.product_name || item.service_name || item.description || '-'}
                  </Text>
                </DataTable.Cell>
                <DataTable.Cell numeric>{item.quantity}</DataTable.Cell>
                <DataTable.Cell numeric>{formatCurrency(item.unit_price)}</DataTable.Cell>
                <DataTable.Cell numeric>{formatCurrency(item.total)}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

      {/* Totals */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.totalRow}>
            <Text variant="bodyMedium">Subtotal</Text>
            <Text variant="bodyMedium">{formatCurrency(invoice.subtotal)}</Text>
          </View>

          {parseFloat(invoice.tax_percent) > 0 && (
            <View style={styles.totalRow}>
              <Text variant="bodyMedium">Tax ({invoice.tax_percent}%)</Text>
              <Text variant="bodyMedium">{formatCurrency(invoice.tax_amount)}</Text>
            </View>
          )}

          {parseFloat(invoice.discount_amount) > 0 && (
            <View style={styles.totalRow}>
              <Text variant="bodyMedium">Discount</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                -{formatCurrency(invoice.discount_amount)}
              </Text>
            </View>
          )}

          <Divider style={styles.divider} />

          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>Total</Text>
            <Text variant="titleMedium" style={[styles.totalAmount, { color: theme.colors.primary }]}>
              {formatCurrency(invoice.total)}
            </Text>
          </View>

          {parseFloat(invoice.amount_paid) > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text variant="bodyMedium">Amount Paid</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                  {formatCurrency(invoice.amount_paid)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text variant="titleSmall" style={{ fontWeight: '600' }}>Amount Due</Text>
                <Text variant="titleSmall" style={{ fontWeight: '600', color: theme.colors.error }}>
                  {formatCurrency(invoice.amount_due)}
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>Notes</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {invoice.notes}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="file-pdf-box"
          onPress={handleDownloadPdf}
          style={styles.actionButton}
        >
          Download PDF
        </Button>

        {canSend && (
          <Button
            mode="contained"
            icon="send"
            onPress={() => sendMutation.mutate()}
            loading={sendMutation.isPending}
            disabled={sendMutation.isPending}
            style={styles.actionButton}
          >
            Send Invoice
          </Button>
        )}

        {canMarkPaid && (
          <Button
            mode="contained"
            icon="check"
            onPress={() => markPaidMutation.mutate()}
            loading={markPaidMutation.isPending}
            disabled={markPaidMutation.isPending}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          >
            Mark as Paid
          </Button>
        )}
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
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontWeight: '700',
  },
  subject: {
    fontWeight: '600',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  customerName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 8,
  },
  totalAmount: {
    fontWeight: '700',
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});
