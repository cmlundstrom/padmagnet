import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction,
  withSequence, withTiming,
} from 'react-native-reanimated';
import PadScoreRing from './PadScoreRing';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * PadPoints header bar — shows animated ring, level name, progress, streak.
 * Lives in the swipe screen header.
 */
export default function PadPointsBar({ padpoints, level, progress, streakDays, lastEarned }) {
  const floatY = useSharedValue(0);
  const floatOpacity = useSharedValue(0);

  // Float-up animation — use useAnimatedReaction to avoid render-time writes
  useAnimatedReaction(
    function() { return lastEarned ? 1 : 0; },
    function(curr, prev) {
      if (curr > 0 && curr !== prev) {
        floatY.value = withSequence(withTiming(0, { duration: 0 }), withTiming(-24, { duration: 1000 }));
        floatOpacity.value = withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 1000 }));
      }
    },
    [lastEarned]
  );

  const floatStyle = useAnimatedStyle(function() {
    return {
      transform: [{ translateY: floatY.value }],
      opacity: floatOpacity.value,
    };
  });

  const levelColor = level.level >= 4 ? COLORS.gold :
                     level.level >= 3 ? COLORS.brandOrange :
                     level.level >= 2 ? COLORS.success : COLORS.accent;

  return (
    <View style={styles.container}>
      {/* Animated PadScore Ring */}
      <View style={styles.ringSection}>
        <PadScoreRing
          progress={progress}
          level={level}
          padpoints={padpoints}
          lastEarned={lastEarned}
        />
        {/* Float-up text */}
        {lastEarned && (
          <Animated.Text style={[styles.floatText, floatStyle]}>
            +{lastEarned.amount}
          </Animated.Text>
        )}
      </View>

      {/* Level + progress */}
      <View style={styles.levelSection}>
        <Text style={[styles.levelName, { color: levelColor }]}>{level.name}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: levelColor }]} />
        </View>
        <Text style={styles.pointsLabel}>{padpoints} PadPoints</Text>
      </View>

      {/* Streak */}
      {streakDays > 0 && (
        <View style={styles.streakPill}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakCount}>{streakDays}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.xs,
    gap: 12,
  },
  ringSection: {
    position: 'relative',
  },
  floatText: {
    position: 'absolute',
    top: -2,
    right: -16,
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
  },
  levelSection: {
    flex: 1,
  },
  levelName: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: LAYOUT.radius.xs,
    overflow: 'hidden',
    marginBottom: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.radius.xs,
  },
  pointsLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: 9,
    color: COLORS.slate,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: LAYOUT.radius.full,
    borderWidth: 1,
    borderColor: COLORS.brandOrange + '44',
  },
  streakIcon: {
    fontSize: 12,
  },
  streakCount: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
  },
});
