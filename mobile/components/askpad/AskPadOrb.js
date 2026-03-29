import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction,
  withRepeat, withTiming, withDelay, withSequence, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Ask Pad Floating Orb — 3 individual stars that twinkle independently.
 * Orb pulses gently. Each star fades in/out on its own slow cycle.
 */

function TwinkleStar({ size, top, left, delay }) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.8);
  const mounted = useSharedValue(0);

  useAnimatedReaction(
    function() { return mounted.value; },
    function(curr) {
      if (curr === 0) {
        mounted.value = 1;
        opacity.value = withDelay(delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.2, { duration: 2200, easing: Easing.inOut(Easing.ease) })
            ),
            -1
          )
        );
        scale.value = withDelay(delay,
          withRepeat(
            withSequence(
              withTiming(1.1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.7, { duration: 2200, easing: Easing.inOut(Easing.ease) })
            ),
            -1
          )
        );
      }
    }
  );

  var starStyle = useAnimatedStyle(function() {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', top: top, left: left }, starStyle]}>
      <Ionicons name="star" size={size} color={COLORS.white} />
    </Animated.View>
  );
}

export default function AskPadOrb({ onPress, remainingQueries, dailyLimit }) {
  var pulseScale = useSharedValue(1);
  var mounted = useSharedValue(0);

  useAnimatedReaction(
    function() { return mounted.value; },
    function(curr) {
      if (curr === 0) {
        mounted.value = 1;
        pulseScale.value = withRepeat(
          withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }
    }
  );

  var pulseStyle = useAnimatedStyle(function() {
    return { transform: [{ scale: pulseScale.value }] };
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.orb, pulseStyle]}>
        {/* 3 individual stars — each twinkles on its own timing */}
        <TwinkleStar size={10} top={6} left={8} delay={0} />
        <TwinkleStar size={14} top={12} left={16} delay={600} />
        <TwinkleStar size={8} top={22} left={24} delay={1200} />

        {/* Query count badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {remainingQueries >= 999 ? '∞' : remainingQueries + '/' + dailyLimit}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

var styles = StyleSheet.create({
  orb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
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
