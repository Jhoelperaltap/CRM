import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function BillingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Billing',
        }}
      />
      <Stack.Screen
        name="products"
        options={{
          title: 'Products',
        }}
      />
      <Stack.Screen
        name="services"
        options={{
          title: 'Services',
        }}
      />
      <Stack.Screen
        name="invoices"
        options={{
          title: 'Invoices',
        }}
      />
      <Stack.Screen
        name="quotes"
        options={{
          title: 'Quotes',
        }}
      />
      <Stack.Screen
        name="invoice/[id]"
        options={{
          title: 'Invoice Details',
        }}
      />
      <Stack.Screen
        name="quote/[id]"
        options={{
          title: 'Quote Details',
        }}
      />
    </Stack>
  );
}
