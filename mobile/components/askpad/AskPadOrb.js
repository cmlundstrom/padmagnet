import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Ask Pad Floating Orb — sparkle icon with subtle pulse.
 * Shows remaining query count as a small badge.
 * Tap opens AskPadChat.
 */
export default function AskPadOrb({ onPress, remainingQueries, dailyLimit }) {
  const pulseScale = useSharedValue(1);
  const mounted = useSharedValue(0);

  // Start pulse after mount — useAnimatedReaction avoids render-time writes
  useAnimatedReaction(
    function() { return mounted.value; },
    function(curr) {
      if (curr === 0) {
        mounted.value = 1;
        pulseScale.value = withRepeat(
          withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }
    }
  );

  const pulseStyle = useAnimatedStyle(function() {
    return { transform: [{ scale: pulseScale.value }] };
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.orb, pulseStyle]}>
        <Ionicons name="sparkles" size={18} color={COLORS.white} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {remainingQueries >= 999 ? '∞' : remainingQueries + '/' + dailyLimit}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  orb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: FONTS.body.bold,
    fontSize: 8,
    color: COLORS.brandOrange,
  },
});
