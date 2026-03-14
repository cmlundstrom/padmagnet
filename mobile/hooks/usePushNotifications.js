/**
 * Push notification registration hook.
 *
 * Requests permission, gets Expo push token, and registers it
 * with the backend on login. Re-registers if token changes.
 */

import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { apiFetch } from '../lib/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications(user) {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [permission, setPermission] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Send to backend
        apiFetch('/api/profiles/push-token', {
          method: 'POST',
          body: JSON.stringify({ token }),
        }).catch(err => console.warn('Failed to register push token:', err.message));
      }
    });

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Could update badge counts here if needed
    });

    // Listen for notification taps (opens app)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.conversationId) {
        // Navigation handled by the component that consumes this hook
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);

  return { expoPushToken, permission };
}

async function registerForPushNotifications() {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
}
