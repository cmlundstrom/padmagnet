import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * PadPoints header bar — shows current PadPoints, PadLevel, and progress.
 * Displays in the swipe screen header. Animates on point gain.
 */
export default function PadPointsBar({ padpoints, level, progress, streakDays, lastEarned }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatOpacity = useRef(new Animated.Value(0)).current;

  // Pulse animation when points earned
  useEffect(() => {
    if (!lastEarned) return;

    // Pulse the PadPoints number
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Float-up "+N" text
    floatAnim.setValue(0);
    floatOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(floatAnim, { toValue: -30, duration: 1200, useNativeDriver: true }),
      Animated.timing(floatOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]).start();
  }, [lastEarned]);

  const levelColor = level.level >= 4 ? COLORS.gold :
                     level.level >= 3 ? COLORS.brandOrange :
                     level.level >= 2 ? COLORS.success : COLORS.accent;

  return (
    <View style={styles.container}>
      {/* PadPoints count */}
      <View style={styles.pointsSection}>
        <Animated.Text style={[styles.points, { color: levelColor, transform: [{ scale: scaleAnim }] }]}>
          {padpoints}
        </Animated.Text>
        <Text style={styles.pointsLabel}>PadPoints</Text>

        {/* Float-up animation */}
        {lastEarned && (
          <Animated.Text style={[styles.floatText, {
            color: COLORS.success,
            transform: [{ translateY: floatAnim }],
            opacity: floatOpacity,
          }]}>
            +{lastEarned.amount}
          </Animated.Text>
        )}
      </View>

      {/* Level + progress bar */}
      <View style={styles.levelSection}>
        <Text style={[styles.levelName, { color: levelColor }]}>{level.name}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: levelColor }]} />
        </View>
      </View>

      {/* Streak */}
      {streakDays > 0 && (
        <View style={styles.streakSection}>
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
    paddingHorizontal: LAYOUT.padding.sm,
    paddingVertical: LAYOUT.padding.xs,
    gap: 10,
  },
  pointsSection: {
    alignItems: 'center',
    position: 'relative',
    minWidth: 50,
  },
  points: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
  },
  pointsLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: 8,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  floatText: {
    position: 'absolute',
    top: -4,
    right: -14,
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
  },
  levelSection: {
    flex: 1,
  },
  levelName: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: LAYOUT.radius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.radius.xs,
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: LAYOUT.radius.full,
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
