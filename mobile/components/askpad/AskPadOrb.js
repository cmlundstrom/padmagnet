import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction,
  withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Ask Pad Floating Orb — "Ask" over "Pad" stacked text with gentle pulse.
 */
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
        <Text style={styles.askText}>Ask</Text>
        <Text style={styles.padText}>Pad</Text>

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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.white,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  askText: {
    fontFamily: FONTS.heading.bold,
    fontSize: 10,
    color: COLORS.white,
    lineHeight: 12,
    letterSpacing: 0.5,
  },
  padText: {
    fontFamily: FONTS.heading.bold,
    fontSize: 10,
    color: COLORS.brandOrange,
    lineHeight: 12,
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -11,
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
