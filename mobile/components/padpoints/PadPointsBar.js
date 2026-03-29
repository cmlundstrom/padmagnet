import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
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
          <Text style={styles.streakIcon}>🔥</Text>
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
                    ? 'Upgrade for more Ask Pad queries, extra search zones, and +20% PadPoints.'
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
                <Text style={styles.upgradeCtaText}>
                  {renterTier === 'free' ? 'Unlock More — from $1.50' : 'Go Master — $3.50'}
                </Text>
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
    color: COLORS.slate,
    textAlign: 'center',
    lineHeight: 17,
  },
  // ── Upgrade CTA ──────────────────────────────────
  upgradeCta: {
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.xl,
    paddingVertical: 14,
    paddingHorizontal: LAYOUT.padding.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.sm,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  upgradeCtaText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    letterSpacing: 0.3,
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
