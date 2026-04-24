import { useEffect, useContext } from 'react';
import { LogBox } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

// Suppress known expo-router v55 + edge-to-edge dev warnings (not from our code)
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
  "ExpoKeepAwake.activate",
]);
import { StatusBar } from 'expo-status-bar';
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
import { enableFreeze } from 'react-native-screens';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AuthProvider, AuthContext } from '../providers/AuthProvider';
import { AlertProvider } from '../providers/AlertProvider';
import { UnreadProvider } from '../providers/UnreadProvider';
import { ErrorBoundary, OfflineBanner } from '../components/ui';
import AuthSuccessBanner from '../components/auth/AuthSuccessBanner';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { COLORS } from '../constants/colors';

// Freeze inactive screens so sibling tabs can't paint through transparent
// regions of the active screen during image-load / transition windows.
// Must run at module scope before any navigator mounts.
enableFreeze(true);

SplashScreen.preventAutoHideAsync();

/**
 * Route guard — runs inside AuthProvider so it can read auth context.
 * Only bounces users out of the app tab groups when they're signed out.
 * Role-based tab-group switching is explicit (Profile CTAs / RoleSwitcher).
 */
function RouteGuard({ children }) {
  const { session, user, loading } = useContext(AuthContext);
  const segments = useSegments();
  const router = useRouter();

  // Register push token when user is logged in
  usePushNotifications(user);

  // Global deep link logger
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) console.log('[DeepLink] Initial URL:', url);
    });
    const linkSub = Linking.addEventListener('url', (e) => {
      console.log('[DeepLink] URL event:', e.url);
    });
    return () => linkSub.remove();
  }, []);

  useEffect(() => {
    if (loading) return;

    // Skip route guard while on auth-callback — let it process tokens
    const onAuthCallback = segments[0] === 'auth-callback';
    if (onAuthCallback) return;

    const inTenant = segments[0] === '(tenant)';
    const inOwner = segments[0] === '(owner)';
    const inApp = inTenant || inOwner;

    // Signed out while still on an app screen → go to welcome.
    // Role-based redirects between (tenant) and (owner) were removed
    // deliberately: tab-group context is the user's current choice, not a
    // function of profiles.role. Switching is explicit via the Profile
    // screen's "Switch to Owner/Renter view" CTAs or the RoleSwitcher.
    if (!session && inApp) {
      router.replace('/welcome');
    }
  }, [session, loading, segments]);

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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
    <ErrorBoundary>
      <AuthProvider>
        <UnreadProvider>
        <AlertProvider>
        <RouteGuard>
        <StatusBar style="light" />
        <OfflineBanner />
        <AuthSuccessBanner />
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
        </UnreadProvider>
      </AuthProvider>
    </ErrorBoundary>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
