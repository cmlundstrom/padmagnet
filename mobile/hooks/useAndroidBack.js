/**
 * Android hardware back button handler.
 * Required because headerShown: false in the root Stack disables
 * the native back button support. Add to every non-tab screen.
 */

import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

export default function useAndroidBack() {
  const router = useRouter();

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [router]);
}
