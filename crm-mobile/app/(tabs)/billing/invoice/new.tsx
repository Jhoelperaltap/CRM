import { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Alert, Pressable } from 'react-native';
import { useTheme, TextInput, Button, Text, IconButton, Divider, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createInvoice, getProducts, getServices } from '../../../../src/api/billing';
import { CreateInvoiceInput, CreateLineItemInput, TenantProduct, TenantService } from '../../../../src/types/billing';

interface LineItemForm extends CreateLineItemInput {
  id: string;
  itemName: string;
}

export default function NewInvoiceScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Omit<CreateInvoiceInput, 'line_items'>>({
    subject: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    tax_percent: '0',
    discount_amount: '0',
    notes: '',
    terms_conditions: '',
  });

  const [lineItems, setLineItems] = useState<LineItemForm[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['billing-products-all'],
    queryFn: () => getProducts(),
  });

  const { data: servicesData } = useQuery({
    queryKey: ['billing-services-all'],
    queryFn: () => getServices(),
  });

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
      Alert.alert('Success', 'Invoice created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || 'Failed to create invoice';
      Alert.alert('Error', message);
    },
  });

  const addProduct = useCallback((product: TenantProduct) => {
    const newItem: LineItemForm = {
      id: `item-${Date.now()}`,
      product: product.id,
      itemName: product.name,
      quantity: '1',
      unit_price: product.unit_price,
      discount_percent: '0',
    };
    setLineItems((prev) => [...prev, newItem]);
    setShowProductPicker(false);
  }, []);

  const addService = useCallback((service: TenantService) => {
    const newItem: LineItemForm = {
      id: `item-${Date.now()}`,
      service: service.id,
      itemName: service.name,
      quantity: '1',
      unit_price: service.unit_price,
      discount_percent: '0',
    };
    setLineItems((prev) => [...prev, newItem]);
    setShowServicePicker(false);
  }, []);

  const addCustomItem = useCallback(() => {
    const newItem: LineItemForm = {
      id: `item-${Date.now()}`,
      itemName: 'Custom Item',
      description: '',
      quantity: '1',
      unit_price: '0',
      discount_percent: '0',
    };
    setLineItems((prev) => [...prev, newItem]);
  }, []);

  const updateLineItem = (id: string, field: keyof LineItemForm, value: string) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      const discount = parseFloat(item.discount_percent || '0') || 0;
      const itemTotal = qty * price * (1 - discount / 100);
      return sum + itemTotal;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const taxPercent = parseFloat(formData.tax_percent || '0');
    const discountAmount = parseFloat(formData.discount_amount || '0');
    const tax = subtotal * (taxPercent / 100);
    return subtotal + tax - discountAmount;
  };

  const handleSubmit = () => {
    if (!formData.subject.trim()) {
      Alert.alert('Validation Error', 'Invoice subject is required');
      return;
    }
    if (!formData.customer_name.trim()) {
      Alert.alert('Validation Error', 'Customer name is required');
      return;
    }
    if (!formData.invoice_date) {
      Alert.alert('Validation Error', 'Invoice date is required');
      return;
    }
    if (lineItems.length === 0) {
      Alert.alert('Validation Error', 'At least one line item is required');
      return;
    }

    const invoiceData: CreateInvoiceInput = {
      ...formData,
      line_items: lineItems.map(({ id, itemName, ...item }) => item),
    };

    mutation.mutate(invoiceData);
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineSmall" style={styles.title}>
        New Invoice
      </Text>

      {/* Customer Info */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Customer Information
      </Text>

      <TextInput
        label="Customer Name *"
        value={formData.customer_name}
        onChangeText={(value) => updateField('customer_name', value)}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Customer Email"
        value={formData.customer_email}
        onChangeText={(value) => updateField('customer_email', value)}
        style={styles.input}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.row}>
        <TextInput
          label="Phone"
          value={formData.customer_phone}
          onChangeText={(value) => updateField('customer_phone', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          keyboardType="phone-pad"
        />
        <View style={styles.halfInput} />
      </View>

      <TextInput
        label="Address"
        value={formData.customer_address}
        onChangeText={(value) => updateField('customer_address', value)}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={2}
      />

      <Divider style={styles.divider} />

      {/* Invoice Details */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Invoice Details
      </Text>

      <TextInput
        label="Subject *"
        value={formData.subject}
        onChangeText={(value) => updateField('subject', value)}
        style={styles.input}
        mode="outlined"
        placeholder="e.g., Invoice for consulting services"
      />

      <View style={styles.row}>
        <TextInput
          label="Invoice Date *"
          value={formData.invoice_date}
          onChangeText={(value) => updateField('invoice_date', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          placeholder="YYYY-MM-DD"
        />

        <TextInput
          label="Due Date"
          value={formData.due_date}
          onChangeText={(value) => updateField('due_date', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          placeholder="YYYY-MM-DD"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Line Items */}
      <View style={styles.lineItemsHeader}>
        <Text variant="titleMedium">Line Items</Text>
        <View style={styles.addButtons}>
          <Button
            mode="outlined"
            compact
            onPress={() => setShowProductPicker(!showProductPicker)}
            style={styles.addButton}
          >
            + Product
          </Button>
          <Button
            mode="outlined"
            compact
            onPress={() => setShowServicePicker(!showServicePicker)}
            style={styles.addButton}
          >
            + Service
          </Button>
          <Button mode="outlined" compact onPress={addCustomItem} style={styles.addButton}>
            + Custom
          </Button>
        </View>
      </View>

      {/* Product Picker */}
      {showProductPicker && (
        <Card style={styles.pickerCard}>
          <Card.Title title="Select Product" />
          <Card.Content>
            {productsData?.results?.length === 0 ? (
              <Text style={styles.emptyText}>No products available</Text>
            ) : (
              productsData?.results?.map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => addProduct(product)}
                  style={styles.pickerItem}
                >
                  <Text>{product.name}</Text>
                  <Text style={{ color: theme.colors.primary }}>${product.unit_price}</Text>
                </Pressable>
              ))
            )}
          </Card.Content>
        </Card>
      )}

      {/* Service Picker */}
      {showServicePicker && (
        <Card style={styles.pickerCard}>
          <Card.Title title="Select Service" />
          <Card.Content>
            {servicesData?.results?.length === 0 ? (
              <Text style={styles.emptyText}>No services available</Text>
            ) : (
              servicesData?.results?.map((service) => (
                <Pressable
                  key={service.id}
                  onPress={() => addService(service)}
                  style={styles.pickerItem}
                >
                  <Text>{service.name}</Text>
                  <Text style={{ color: theme.colors.primary }}>${service.unit_price}</Text>
                </Pressable>
              ))
            )}
          </Card.Content>
        </Card>
      )}

      {/* Line Items List */}
      {lineItems.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          No items added yet. Add products, services, or custom items.
        </Text>
      ) : (
        lineItems.map((item, index) => (
          <Card key={item.id} style={styles.lineItemCard}>
            <Card.Content>
              <View style={styles.lineItemHeader}>
                <Text variant="titleSmall">{item.itemName}</Text>
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => removeLineItem(item.id)}
                />
              </View>
              <View style={styles.row}>
                <TextInput
                  label="Qty"
                  value={item.quantity}
                  onChangeText={(value) => updateLineItem(item.id, 'quantity', value)}
                  style={[styles.input, { flex: 1 }]}
                  mode="outlined"
                  dense
                  keyboardType="decimal-pad"
                />
                <TextInput
                  label="Price"
                  value={item.unit_price}
                  onChangeText={(value) => updateLineItem(item.id, 'unit_price', value)}
                  style={[styles.input, { flex: 1 }]}
                  mode="outlined"
                  dense
                  keyboardType="decimal-pad"
                  left={<TextInput.Affix text="$" />}
                />
                <TextInput
                  label="Disc %"
                  value={item.discount_percent}
                  onChangeText={(value) => updateLineItem(item.id, 'discount_percent', value)}
                  style={[styles.input, { flex: 1 }]}
                  mode="outlined"
                  dense
                  keyboardType="decimal-pad"
                />
              </View>
              {!item.product && !item.service && (
                <TextInput
                  label="Description"
                  value={item.description || ''}
                  onChangeText={(value) => updateLineItem(item.id, 'description', value)}
                  style={styles.input}
                  mode="outlined"
                  dense
                />
              )}
            </Card.Content>
          </Card>
        ))
      )}

      <Divider style={styles.divider} />

      {/* Totals */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Totals
      </Text>

      <View style={styles.row}>
        <TextInput
          label="Tax %"
          value={formData.tax_percent}
          onChangeText={(value) => updateField('tax_percent', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          keyboardType="decimal-pad"
        />
        <TextInput
          label="Discount"
          value={formData.discount_amount}
          onChangeText={(value) => updateField('discount_amount', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          keyboardType="decimal-pad"
          left={<TextInput.Affix text="$" />}
        />
      </View>

      <Card style={styles.totalCard}>
        <Card.Content>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>${calculateSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax ({formData.tax_percent || 0}%):</Text>
            <Text>
              ${(calculateSubtotal() * (parseFloat(formData.tax_percent || '0') / 100)).toFixed(2)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Discount:</Text>
            <Text>-${parseFloat(formData.discount_amount || '0').toFixed(2)}</Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />
          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              Total:
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.primary }}>
              ${calculateTotal().toFixed(2)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {/* Notes */}
      <TextInput
        label="Notes"
        value={formData.notes}
        onChangeText={(value) => updateField('notes', value)}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={3}
      />

      <TextInput
        label="Terms & Conditions"
        value={formData.terms_conditions}
        onChangeText={(value) => updateField('terms_conditions', value)}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={3}
      />

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={mutation.isPending}
          disabled={mutation.isPending}
        >
          Create Invoice
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  lineItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  addButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  addButton: {
    marginVertical: 4,
  },
  pickerCard: {
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  lineItemCard: {
    marginBottom: 8,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalCard: {
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
});
