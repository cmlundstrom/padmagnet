import { useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

/**
 * AuthSuccessBanner — global slide-down banner on successful sign-in.
 *
 * Listens to supabase.auth.onAuthStateChange for SIGNED_IN events.
 * Shows a green banner with the user's email for 3 seconds, then auto-dismisses.
 * Works for all auth methods (Google, Facebook, email/password, magic link)
 * and both roles (renter + owner). Mounted once at root layout level.
 */
export default function AuthSuccessBanner() {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const lastEventId = useRef(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN') return;
      if (!session?.user) return;
      // Skip anonymous sessions
      if (session.user.is_anonymous) return;

      // Deduplicate — onAuthStateChange can fire multiple times for the same sign-in
      const eventId = `${session.user.id}_${Date.now()}`;
      if (lastEventId.current && Date.now() - parseInt(lastEventId.current.split('_')[1]) < 3000) return;
      lastEventId.current = eventId;

      // Show banner
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      translateY.value = withSequence(
        withTiming(0, { duration: 300 }),
        withDelay(3000, withTiming(-100, { duration: 300 }))
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.banner, { paddingTop: insets.top + 8 }, animStyle]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
      <Text style={styles.text}>Signed in successfully</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  text: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
