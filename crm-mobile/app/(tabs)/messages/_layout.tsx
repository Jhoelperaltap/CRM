import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function MessagesLayout() {
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
          title: 'Messages',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Message',
        }}
      />
      <Stack.Screen
        name="compose"
        options={{
          title: 'New Message',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
