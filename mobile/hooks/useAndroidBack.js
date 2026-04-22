/**
 * Android hardware back button handler.
 * Required because headerShown: false in the root Stack disables
 * the native back button support. Add to every non-tab screen.
 *
 * Pass an onBack callback for screens reached via router.replace()
 * where canGoBack() is false but a custom fallback is desired
 * (e.g. auth email screen → replace('/welcome')).
 */

import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

export default function useAndroidBack(onBack) {
  const router = useRouter();

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [router, onBack]);
}
