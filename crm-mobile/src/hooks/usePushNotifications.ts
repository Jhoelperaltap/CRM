import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { registerDevice } from '../api/notifications';
import { useAuthStore } from '../stores/auth-store';

// Check if we're on a native platform (not web)
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Configure notification handling behavior (only on native)
if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    isRegistered: false,
    error: null,
  });

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Register for push notifications
  async function registerForPushNotificationsAsync(): Promise<string | null> {
    // Push notifications only work on native platforms
    if (!isNative) {
      setState((prev) => ({
        ...prev,
        error: 'Push notifications are not available on web',
      }));
      return null;
    }

    let token: string | null = null;

    // Push notifications require a physical device
    if (!Device.isDevice) {
      setState((prev) => ({
        ...prev,
        error: 'Push notifications require a physical device',
      }));
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      setState((prev) => ({
        ...prev,
        error: 'Permission not granted for push notifications',
      }));
      return null;
    }

    try {
      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      // In development without EAS, projectId won't be available
      // Skip push notification registration silently
      if (!projectId) {
        console.log('Push notifications: No projectId configured (development mode)');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData.data;
    } catch (error: any) {
      // Don't show error in development - push notifications are optional
      console.log('Push notifications not available:', error?.message || error);
      return null;
    }

    // Android-specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976D2',
      });
    }

    return token;
  }

  // Register device token with backend
  async function registerWithBackend(token: string): Promise<boolean> {
    try {
      await registerDevice({
        token,
        platform: Platform.OS as 'ios' | 'android',
      });
      return true;
    } catch (error) {
      console.error('Error registering device with backend:', error);
      return false;
    }
  }

  // Handle notification tap - navigate to appropriate screen
  function handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data;

    if (!data) return;

    // Navigate based on notification type
    if (data.type === 'message' && data.message_id) {
      router.push(`/(tabs)/messages/${data.message_id}`);
    } else if (data.type === 'case' && data.case_id) {
      router.push(`/(tabs)/cases/${data.case_id}`);
    } else if (data.type === 'document' && data.document_id) {
      router.push('/(tabs)/documents');
    } else if (data.type === 'appointment') {
      router.push('/(tabs)/appointments');
    }
  }

  useEffect(() => {
    // Skip on web platform
    if (!isNative) {
      return;
    }

    // Only register when authenticated
    if (!isAuthenticated) {
      return;
    }

    // Register for push notifications
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setState((prev) => ({ ...prev, expoPushToken: token }));

        // Register with backend
        const registered = await registerWithBackend(token);
        setState((prev) => ({ ...prev, isRegistered: registered }));
      }
    });

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setState((prev) => ({ ...prev, notification }));
      }
    );

    // Listen for notification interactions (user taps on notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      // Safely remove subscriptions (check if function exists for web compatibility)
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated]);

  return state;
}

/**
 * Request notification permissions without registering
 * Useful for showing permission request at specific times
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isNative) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Get current notification permissions status
 */
export async function getNotificationPermissions(): Promise<Notifications.PermissionStatus | null> {
  if (!isNative) return null;
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
