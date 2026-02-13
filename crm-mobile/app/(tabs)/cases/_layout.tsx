import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function CasesLayout() {
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
          title: 'My Cases',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Case Details',
        }}
      />
    </Stack>
  );
}
