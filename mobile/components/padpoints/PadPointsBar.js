import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
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
  const [showGameRules, setShowGameRules] = useState(false);

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
            withTiming(1.15, { duration: 1350, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.95, { duration: 1125, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.08, { duration: 1240, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1010, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
        flameRotate.value = withRepeat(
          withSequence(
            withTiming(4, { duration: 1125, easing: Easing.inOut(Easing.ease) }),
            withTiming(-3, { duration: 1350, easing: Easing.inOut(Easing.ease) }),
            withTiming(2, { duration: 900, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1125, easing: Easing.inOut(Easing.ease) }),
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
                       renterTier === 'explorer' ? '30/day' : '10/day';

  return (
    <View style={styles.container}>
      {/* PadPoints ring + level — tappable to show game rules */}
      <TouchableOpacity
        style={styles.gameHotspot}
        onPress={() => setShowGameRules(true)}
        activeOpacity={0.7}
      >
        <View style={styles.ringSection}>
          <PadScoreRing
            progress={progress}
            level={level}
            padpoints={padpoints}
            lastEarned={lastEarned}
          />
          {lastEarned && (
            <Animated.Text style={[styles.floatText, floatStyle]}>
              +{lastEarned.amount}
            </Animated.Text>
          )}
        </View>

        <View style={styles.levelSection}>
          <Text style={[styles.levelName, { color: levelColor }]}>{level.name}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: levelColor }]} />
          </View>
          <Text style={styles.pointsLabel}>{padpoints} PadPoints</Text>
        </View>
      </TouchableOpacity>

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

      {/* Game Rules modal */}
      <Modal visible={showGameRules} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowGameRules(false)}>
        <View style={styles.tooltipBackdrop}>
          <Pressable style={{ flex: 1, width: '100%' }} onPress={() => setShowGameRules(false)} />
          <View style={styles.rulesCard}>
            <ScrollView showsVerticalScrollIndicator={true} bounces={false} nestedScrollEnabled>
              {/* Header */}
              <Text style={styles.rulesEmoji}>🎮</Text>
              <Text style={styles.rulesTitle}>How PadPoints Work</Text>
              <Text style={styles.rulesSubtitle}>
                Every rental search earns PadPoints—use them to power your AI tools for free! No purchase required.
              </Text>

              {/* Earn table */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>Ways to Earn</Text>
                <View style={styles.earnTable}>
                  <View style={styles.earnRow}>
                    <Text style={styles.earnAction}>💚 Save a listing</Text>
                    <Text style={styles.earnPoints}>+5</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={styles.earnAction}>💚 Save a high match (80%+)</Text>
                    <Text style={styles.earnPoints}>+8</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={styles.earnAction}>👈 Pass on a listing</Text>
                    <Text style={styles.earnPoints}>+2</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={styles.earnAction}>📱 Open the app daily</Text>
                    <Text style={styles.earnPoints}>+10</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={styles.earnAction}>🔥 7-day streak bonus</Text>
                    <Text style={styles.earnPoints}>+50</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={styles.earnAction}>✉️ Send your first message</Text>
                    <Text style={styles.earnPoints}>+25</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={styles.earnAction}>✨ Answer a Smart Prompt</Text>
                    <Text style={styles.earnPoints}>+10–15</Text>
                  </View>
                </View>
              </View>

              {/* Levels */}
              <View style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>Levels</Text>
                <View style={styles.earnTable}>
                  <View style={styles.earnRow}>
                    <Text style={[styles.earnAction, { color: COLORS.accent }]}>Starter</Text>
                    <Text style={styles.earnPoints}>0 pts</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={[styles.earnAction, { color: COLORS.success }]}>Pad Explorer</Text>
                    <Text style={styles.earnPoints}>80 pts</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={[styles.earnAction, { color: COLORS.brandOrange }]}>Pad Hunter</Text>
                    <Text style={styles.earnPoints}>200 pts</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={[styles.earnAction, { color: COLORS.gold }]}>Pad Expert</Text>
                    <Text style={styles.earnPoints}>500 pts</Text>
                  </View>
                  <View style={styles.earnRow}>
                    <Text style={[styles.earnAction, { color: COLORS.gold }]}>Pad Master</Text>
                    <Text style={styles.earnPoints}>1,000 pts</Text>
                  </View>
                </View>
              </View>

              {/* Free AskPad callout */}
              <View style={styles.freeCallout}>
                <Text style={styles.freeCalloutTitle}>🆓 Free AskPad Upgrade</Text>
                <Text style={styles.freeCalloutBody}>
                  Earn 350 PadPoints and you can unlock AskPad Explorer for free — no credit card needed. That's 30 AI searches a day, 2 search zones, and +20% faster point earning.
                </Text>
                <Text style={styles.freeCalloutMath}>
                  Just swipe and open the app daily — most renters hit 350 in under 2 weeks.
                </Text>
              </View>

              {/* Current status */}
              <View style={styles.rulesStatusRow}>
                <View style={styles.rulesStatusBox}>
                  <Text style={styles.rulesStatusValue}>{padpoints}</Text>
                  <Text style={styles.rulesStatusLabel}>Your Points</Text>
                </View>
                <View style={styles.rulesStatusDivider} />
                <View style={styles.rulesStatusBox}>
                  <Text style={[styles.rulesStatusValue, { color: levelColor }]}>{level.name}</Text>
                  <Text style={styles.rulesStatusLabel}>Your Level</Text>
                </View>
                <View style={styles.rulesStatusDivider} />
                <View style={styles.rulesStatusBox}>
                  <Text style={styles.rulesStatusValue}>{padpoints >= 350 ? '✅' : `${padpoints}/350`}</Text>
                  <Text style={styles.rulesStatusLabel}>Free Upgrade</Text>
                </View>
              </View>

              {/* Upgrade CTA — reward at end of scroll */}
              {renterTier !== 'master' && onUpgrade && (
                <TouchableOpacity
                  style={styles.rulesCta}
                  onPress={() => {
                    setShowGameRules(false);
                    onUpgrade();
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FF8C42', COLORS.logoOrange, '#C94A1E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rulesCtaGradient}
                  >
                    <Text style={styles.rulesCtaText}>
                      {renterTier === 'free'
                        ? padpoints >= 350
                          ? 'Redeem 350 PadPoints for Free Upgrade'
                          : 'Skip the Game Grind?\nUpgrade Ai Search\nfrom $1.50 mo.!'
                        : 'Go Pad Master — $3.50/mo'
                      }
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Dismiss */}
              <TouchableOpacity
                style={styles.tooltipDismiss}
                onPress={() => setShowGameRules(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.tooltipDismissText}>
                  {renterTier !== 'master' ? 'No thanks, I\'ll keep earning' : 'Got it'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <Pressable style={{ flex: 1, width: '100%' }} onPress={() => setShowGameRules(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gameHotspot: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
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
  // ── Game Rules modal ────────────────────────────
  rulesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    marginHorizontal: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
    width: LAYOUT.card.width,
    maxHeight: LAYOUT.window.height * 0.72,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  rulesEmoji: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 4,
  },
  rulesTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 2,
  },
  rulesSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: LAYOUT.padding.md,
  },
  rulesSection: {
    width: '100%',
    marginBottom: LAYOUT.padding.sm,
  },
  rulesSectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  earnTable: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.sm,
    padding: LAYOUT.padding.xs,
    gap: 0,
  },
  earnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: LAYOUT.padding.sm,
  },
  earnAction: {
    fontFamily: FONTS.body.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  earnPoints: {
    fontFamily: FONTS.heading.bold,
    fontSize: 11,
    color: COLORS.success,
    minWidth: 40,
    textAlign: 'right',
  },
  // ── Free callout ────────────────────────────────
  freeCallout: {
    width: '100%',
    backgroundColor: COLORS.success + '15',
    borderRadius: LAYOUT.radius.sm,
    padding: LAYOUT.padding.sm,
    borderWidth: 1,
    borderColor: COLORS.success + '33',
    marginBottom: LAYOUT.padding.sm,
  },
  freeCalloutTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    marginBottom: 2,
  },
  freeCalloutBody: {
    fontFamily: FONTS.body.regular,
    fontSize: 11,
    color: COLORS.white,
    lineHeight: 16,
    marginBottom: 4,
  },
  freeCalloutMath: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 11,
    color: COLORS.brandOrange,
    lineHeight: 15,
  },
  // ── Rules status row ────────────────────────────
  rulesStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.xs,
  },
  rulesStatusBox: {
    flex: 1,
    alignItems: 'center',
  },
  rulesStatusValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    marginBottom: 2,
  },
  rulesStatusLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: 9,
    color: COLORS.slate,
  },
  rulesStatusDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  // ── Rules CTA ───────────────────────────────────
  rulesCta: {
    width: '100%',
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    marginTop: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.xs,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.30)',
    borderLeftColor: 'rgba(255,255,255,0.15)',
    borderRightColor: 'rgba(0,0,0,0.12)',
    borderBottomColor: 'rgba(0,0,0,0.20)',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  rulesCtaGradient: {
    paddingVertical: 14,
    paddingHorizontal: LAYOUT.padding.md,
    alignItems: 'center',
  },
  rulesCtaText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
