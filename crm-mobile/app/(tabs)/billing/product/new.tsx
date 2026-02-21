import { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { useTheme, TextInput, Button, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '../../../../src/api/billing';
import { CreateProductInput } from '../../../../src/types/billing';

export default function NewProductScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    product_code: '',
    category: '',
    unit_price: '',
    cost_price: '',
    unit: 'Units',
    qty_in_stock: 0,
    description: '',
  });

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-products'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
      Alert.alert('Success', 'Product created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || 'Failed to create product';
      Alert.alert('Error', message);
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return;
    }
    if (!formData.product_code.trim()) {
      Alert.alert('Validation Error', 'Product code is required');
      return;
    }
    if (!formData.unit_price || parseFloat(formData.unit_price) < 0) {
      Alert.alert('Validation Error', 'Valid unit price is required');
      return;
    }

    mutation.mutate(formData);
  };

  const updateField = (field: keyof CreateProductInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineSmall" style={styles.title}>
        New Product
      </Text>

      <TextInput
        label="Product Name *"
        value={formData.name}
        onChangeText={(value) => updateField('name', value)}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Product Code *"
        value={formData.product_code}
        onChangeText={(value) => updateField('product_code', value)}
        style={styles.input}
        mode="outlined"
        autoCapitalize="characters"
      />

      <TextInput
        label="Category"
        value={formData.category}
        onChangeText={(value) => updateField('category', value)}
        style={styles.input}
        mode="outlined"
      />

      <View style={styles.row}>
        <TextInput
          label="Unit Price *"
          value={formData.unit_price}
          onChangeText={(value) => updateField('unit_price', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          keyboardType="decimal-pad"
          left={<TextInput.Affix text="$" />}
        />

        <TextInput
          label="Cost Price"
          value={formData.cost_price}
          onChangeText={(value) => updateField('cost_price', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          keyboardType="decimal-pad"
          left={<TextInput.Affix text="$" />}
        />
      </View>

      <View style={styles.row}>
        <TextInput
          label="Unit"
          value={formData.unit}
          onChangeText={(value) => updateField('unit', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          placeholder="e.g., Units, Kg, Pcs"
        />

        <TextInput
          label="Qty in Stock"
          value={formData.qty_in_stock?.toString() || '0'}
          onChangeText={(value) => updateField('qty_in_stock', parseInt(value) || 0)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          keyboardType="number-pad"
        />
      </View>

      <TextInput
        label="Description"
        value={formData.description}
        onChangeText={(value) => updateField('description', value)}
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
          Create Product
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
});
