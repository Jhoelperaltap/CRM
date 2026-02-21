import { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { useTheme, TextInput, Button, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createService } from '../../../../src/api/billing';
import { CreateServiceInput } from '../../../../src/types/billing';

export default function NewServiceScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreateServiceInput>({
    name: '',
    service_code: '',
    category: '',
    unit_price: '',
    usage_unit: 'Hours',
    description: '',
  });

  const mutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
      Alert.alert('Success', 'Service created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || 'Failed to create service';
      Alert.alert('Error', message);
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Service name is required');
      return;
    }
    if (!formData.service_code.trim()) {
      Alert.alert('Validation Error', 'Service code is required');
      return;
    }
    if (!formData.unit_price || parseFloat(formData.unit_price) < 0) {
      Alert.alert('Validation Error', 'Valid unit price is required');
      return;
    }

    mutation.mutate(formData);
  };

  const updateField = (field: keyof CreateServiceInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="headlineSmall" style={styles.title}>
        New Service
      </Text>

      <TextInput
        label="Service Name *"
        value={formData.name}
        onChangeText={(value) => updateField('name', value)}
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Service Code *"
        value={formData.service_code}
        onChangeText={(value) => updateField('service_code', value)}
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
          label="Usage Unit"
          value={formData.usage_unit}
          onChangeText={(value) => updateField('usage_unit', value)}
          style={[styles.input, styles.halfInput]}
          mode="outlined"
          placeholder="e.g., Hours, Sessions"
        />
      </View>

      <TextInput
        label="Description"
        value={formData.description}
        onChangeText={(value) => updateField('description', value)}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={4}
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
          Create Service
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
