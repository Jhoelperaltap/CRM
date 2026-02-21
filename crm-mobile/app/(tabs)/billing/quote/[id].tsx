import { StyleSheet, ScrollView, View, Alert, Linking } from 'react-native';
import { useTheme, Card, Text, Button, Divider, DataTable } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getQuote, sendQuote, convertQuoteToInvoice, getQuotePdfUrl } from '../../../../src/api/billing';
import { LoadingSpinner, ErrorMessage } from '../../../../src/components/ui';
import { StatusBadge } from '../../../../src/components/ui/StatusBadge';
import { QUOTE_STATUS_LABELS } from '../../../../src/types/billing';
import { formatDate } from '../../../../src/utils/date';

export default function QuoteDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: quote, isLoading, error, refetch } = useQuery({
    queryKey: ['billing-quote', id],
    queryFn: () => getQuote(id!),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendQuote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['billing-quotes'] });
      Alert.alert('Success', 'Quote sent successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to send quote');
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => convertQuoteToInvoice(id!),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['billing-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['billing-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      Alert.alert('Success', 'Quote converted to invoice', [
        {
          text: 'View Invoice',
          onPress: () => router.replace({
            pathname: '/(tabs)/billing/invoice/[id]' as any,
            params: { id: invoice.id },
          }),
        },
        { text: 'OK' },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to convert quote to invoice');
    },
  });

  const handleDownloadPdf = async () => {
    try {
      const pdfUrl = await getQuotePdfUrl(id!);
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
    return <LoadingSpinner fullScreen message="Loading quote..." />;
  }

  if (error || !quote) {
    return (
      <ErrorMessage
        message="Failed to load quote"
        onRetry={refetch}
        fullScreen
      />
    );
  }

  const statusLabel = QUOTE_STATUS_LABELS[quote.status] || quote.status;
  const canSend = quote.status === 'draft';
  const canConvert = quote.status === 'accepted';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.headerRow}>
            <Text variant="headlineSmall" style={styles.quoteNumber}>
              {quote.quote_number}
            </Text>
            <StatusBadge status={quote.status} label={statusLabel} />
          </View>

          <Text variant="titleMedium" style={styles.subject}>
            {quote.subject}
          </Text>

          <View style={styles.dateRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              <MaterialCommunityIcons name="calendar" size={12} /> Date: {formatDate(quote.quote_date)}
            </Text>
            {quote.valid_until && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                <MaterialCommunityIcons name="calendar-clock" size={12} /> Valid until: {formatDate(quote.valid_until)}
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
            {quote.customer_name}
          </Text>
          {quote.customer_email && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {quote.customer_email}
            </Text>
          )}
          {quote.customer_phone && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {quote.customer_phone}
            </Text>
          )}
          {quote.customer_address && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {quote.customer_address}
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

            {quote.line_items.map((item, index) => (
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
            <Text variant="bodyMedium">{formatCurrency(quote.subtotal)}</Text>
          </View>

          {parseFloat(quote.tax_percent) > 0 && (
            <View style={styles.totalRow}>
              <Text variant="bodyMedium">Tax ({quote.tax_percent}%)</Text>
              <Text variant="bodyMedium">{formatCurrency(quote.tax_amount)}</Text>
            </View>
          )}

          {parseFloat(quote.discount_amount) > 0 && (
            <View style={styles.totalRow}>
              <Text variant="bodyMedium">Discount</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                -{formatCurrency(quote.discount_amount)}
              </Text>
            </View>
          )}

          <Divider style={styles.divider} />

          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>Total</Text>
            <Text variant="titleMedium" style={[styles.totalAmount, { color: theme.colors.primary }]}>
              {formatCurrency(quote.total)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>Notes</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {quote.notes}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Terms */}
      {quote.terms_conditions && (
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {quote.terms_conditions}
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
            Send Quote
          </Button>
        )}

        {canConvert && (
          <Button
            mode="contained"
            icon="file-document"
            onPress={() => {
              Alert.alert(
                'Convert to Invoice',
                'This will create an invoice from this quote. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Convert', onPress: () => convertMutation.mutate() },
                ]
              );
            }}
            loading={convertMutation.isPending}
            disabled={convertMutation.isPending}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          >
            Convert to Invoice
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
  quoteNumber: {
    fontWeight: '700',
  },
  subject: {
    fontWeight: '600',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
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
