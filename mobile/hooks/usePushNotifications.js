/**
 * Push notification registration hook.
 *
 * Requests permission, gets Expo push token, and registers it
 * with the backend on login. Re-registers if token changes.
 *
 * Safely checks for native module before loading expo-notifications
 * so it works on builds with or without the module included.
 */

import { useState, useEffect, useRef } from 'react';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import { apiFetch } from '../lib/api';

// Check if native module exists BEFORE requiring expo-notifications
const nativeAvailable = !!NativeModules.ExpoPushTokenManager;

let Notifications = null;
let Device = null;

if (nativeAvailable) {
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  // Configure how notifications appear when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export function usePushNotifications(user) {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [permission, setPermission] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!user || !nativeAvailable) return;

    registerForPushNotifications().then(token => {
      if (token) {
        setExpoPushToken(token);
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
  if (!nativeAvailable || !Notifications || !Device) return null;

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
}
