import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function DocumentsLayout() {
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
          title: 'My Documents',
        }}
      />
      <Stack.Screen
        name="upload"
        options={{
          title: 'Upload Document',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
