import { useEffect, useContext } from 'react';
import { AppState, Platform, LogBox } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';

// Suppress known expo-router v55 + edge-to-edge dev warnings (not from our code)
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
  '`setBackgroundColorAsync` is not supported with edge-to-edge enabled',
]);
import { StatusBar } from 'expo-status-bar';
let NavigationBar = null;
try { NavigationBar = require('expo-navigation-bar'); } catch (e) {}
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AuthProvider, AuthContext } from '../providers/AuthProvider';
import { AlertProvider } from '../providers/AlertProvider';
import { ErrorBoundary, OfflineBanner } from '../components/ui';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { COLORS } from '../constants/colors';

SplashScreen.preventAutoHideAsync();

/**
 * Route guard — runs inside AuthProvider so it can read auth context.
 * Redirects users to the correct tab group when:
 *   - App resumes from background (AppState change)
 *   - Auth state changes (login/logout)
 */
function RouteGuard({ children }) {
  const { session, user, role, loading } = useContext(AuthContext);
  const segments = useSegments();
  const router = useRouter();

  // Register push token when user is logged in
  usePushNotifications(user);

  useEffect(() => {
    if (loading) return;

    const inTenant = segments[0] === '(tenant)';
    const inOwner = segments[0] === '(owner)';
    const inApp = inTenant || inOwner;

    if (!session && inApp) {
      // Logged out but still on an app screen → go to welcome
      router.replace('/welcome');
    } else if (session && role === 'owner' && inTenant) {
      // Owner stuck in tenant tab group → redirect
      router.replace('/(owner)/listings');
    } else if (session && role !== 'owner' && inOwner) {
      // Tenant stuck in owner tab group → redirect
      router.replace('/(tenant)/swipe');
    }
  }, [session, role, loading, segments]);

  // Also re-check when app returns from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || loading || !session) return;

      const inTenant = segments[0] === '(tenant)';
      const inOwner = segments[0] === '(owner)';

      if (role === 'owner' && inTenant) {
        router.replace('/(owner)/listings');
      } else if (role !== 'owner' && inOwner) {
        router.replace('/(tenant)/swipe');
      }
    });

    return () => sub.remove();
  }, [session, role, loading, segments]);

  return children;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-SemiBold': DMSans_600SemiBold,
    'DMSans-Bold': DMSans_700Bold,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Note: NavigationBar.setBackgroundColorAsync is deprecated with edge-to-edge (SDK 55+).
  // The system nav bar is now transparent by default. Tab bar handles its own background.

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
    <ErrorBoundary>
      <AuthProvider>
        <AlertProvider>
        <RouteGuard>
        <StatusBar style="light" />
        <OfflineBanner />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tenant)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(owner)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="owner" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="listing/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="conversation/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="about-you" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="auth-callback" options={{ animation: 'none' }} />
        </Stack>
        </RouteGuard>
        </AlertProvider>
      </AuthProvider>
    </ErrorBoundary>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
