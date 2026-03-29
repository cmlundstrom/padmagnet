import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction,
  withSequence, withTiming, withRepeat, withDelay, Easing,
} from 'react-native-reanimated';
import PadScoreRing from './PadScoreRing';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * PadPoints header bar — shows animated ring, level name, progress, streak.
 * Lives in the swipe screen header.
 */
export default function PadPointsBar({ padpoints, level, progress, streakDays, lastEarned, renterTier, onUpgrade }) {
  const [showTooltip, setShowTooltip] = useState(false);

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

  // Flame flicker — gentle scale + slight rotation wobble
  const flameScale = useSharedValue(1);
  const flameRotate = useSharedValue(0);

  useAnimatedReaction(
    function() { return streakDays; },
    function(curr) {
      if (curr > 0) {
        flameScale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.95, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.08, { duration: 550, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
        flameRotate.value = withRepeat(
          withSequence(
            withTiming(4, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(-3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(2, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
      }
    },
    [streakDays]
  );

  const flameStyle = useAnimatedStyle(function() {
    return {
      transform: [
        { scale: flameScale.value },
        { rotate: flameRotate.value + 'deg' },
      ],
    };
  });

  const levelColor = level.level >= 4 ? COLORS.gold :
                     level.level >= 3 ? COLORS.brandOrange :
                     level.level >= 2 ? COLORS.success : COLORS.accent;

  const tierLabel = renterTier === 'master' ? 'Pad Master' :
                    renterTier === 'explorer' ? 'Explorer' : 'Free';

  const dailyQueries = renterTier === 'master' ? 'Unlimited' :
                       renterTier === 'explorer' ? '30/day' : '5/day';

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

      {/* Streak — tappable */}
      {streakDays > 0 && (
        <TouchableOpacity
          style={styles.streakPill}
          onPress={() => setShowTooltip(true)}
          activeOpacity={0.7}
        >
          <Animated.Text style={[styles.streakIcon, flameStyle]}>🔥</Animated.Text>
          <Text style={styles.streakCount}>{streakDays}</Text>
        </TouchableOpacity>
      )}

      {/* Streak tooltip modal */}
      <Modal visible={showTooltip} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowTooltip(false)}>
        <Pressable style={styles.tooltipBackdrop} onPress={() => setShowTooltip(false)}>
          <Pressable style={styles.tooltipCard} onPress={e => e.stopPropagation()}>
            {/* Header */}
            <Text style={styles.tooltipEmoji}>🔥</Text>
            <Text style={styles.tooltipTitle}>
              {streakDays} Day Streak!
            </Text>

            {/* Explanation */}
            <Text style={styles.tooltipBody}>
              Swipe daily to build your streak and earn bonus PadPoints.
              Points unlock levels, and levels unlock perks.
            </Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{padpoints}</Text>
                <Text style={styles.statLabel}>PadPoints</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{level.name}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{dailyQueries}</Text>
                <Text style={styles.statLabel}>Ask Pad</Text>
              </View>
            </View>

            {/* Tier info */}
            <View style={styles.tierInfo}>
              <Text style={styles.tierInfoText}>
                <Text style={{ color: COLORS.white, fontFamily: FONTS.body.semiBold }}>Your plan: </Text>
                <Text style={{ color: COLORS.brandOrange }}>{tierLabel}</Text>
              </Text>
              {renterTier !== 'master' && (
                <Text style={styles.tierHint}>
                  {renterTier === 'free'
                    ? 'Level Up: More AskPad AI Searches + Extra Save Zones +20% PadPoints!'
                    : 'Go Master for unlimited queries, 3 zones, and the Verified Renter badge.'
                  }
                </Text>
              )}

            </View>

            {/* Upgrade CTA */}
            {renterTier !== 'master' && onUpgrade && (
              <TouchableOpacity
                style={styles.upgradeCta}
                onPress={() => {
                  setShowTooltip(false);
                  onUpgrade();
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#FF8C42', COLORS.logoOrange, '#C94A1E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.upgradeCtaGradient}
                >
                  <Text style={styles.upgradeCtaText}>
                    {renterTier === 'free'
                      ? 'Add more AskPad Ai Power Searches, from $1.50 mo.'
                      : 'Add more AskPad Ai Power Searches, from $3.50 mo.'
                    }
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Dismiss */}
            <TouchableOpacity
              style={styles.tooltipDismiss}
              onPress={() => setShowTooltip(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.tooltipDismissText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  // ── Tooltip modal ──────────────────────────────────
  tooltipBackdrop: {
    flex: 1,
    backgroundColor: COLORS.scrimDarker,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    marginHorizontal: LAYOUT.padding.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.brandOrange + '33',
    width: LAYOUT.card.width,
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltipEmoji: {
    fontSize: 40,
    marginBottom: LAYOUT.padding.sm,
  },
  tooltipTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  tooltipBody: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: LAYOUT.padding.md,
  },
  // ── Stats row ────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.slate,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  // ── Tier info ────────────────────────────────────
  tierInfo: {
    width: '100%',
    marginBottom: LAYOUT.padding.md,
  },
  tierInfoText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  tierHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 17,
  },
  // ── Upgrade CTA ──────────────────────────────────
  upgradeCta: {
    width: '100%',
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    marginBottom: LAYOUT.padding.sm,
    // 3D bevel border
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.30)',
    borderLeftColor: 'rgba(255,255,255,0.15)',
    borderRightColor: 'rgba(0,0,0,0.12)',
    borderBottomColor: 'rgba(0,0,0,0.20)',
    // Warm glow shadow
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  upgradeCtaGradient: {
    paddingVertical: 15,
    paddingHorizontal: LAYOUT.padding.lg,
    alignItems: 'center',
  },
  upgradeCtaText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 20,
    // Subtle text shadow for depth
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // ── Dismiss ──────────────────────────────────────
  tooltipDismiss: {
    paddingVertical: LAYOUT.padding.sm,
    paddingHorizontal: LAYOUT.padding.lg,
  },
  tooltipDismissText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
