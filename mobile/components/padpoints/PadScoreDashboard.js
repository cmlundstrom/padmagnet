import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { LEVELS } from '../../hooks/usePadPoints';

/**
 * PadScore Dashboard — replaces the old profile header.
 * Shows: PadPoints total, PadLevel, progress bar, streak, badges.
 */

const BADGE_DEFS = {
  first_swipe: { emoji: '🏠', name: 'First Swipe' },
  pad_explorer: { emoji: '⭐', name: 'Pad Explorer' },
  pad_hunter: { emoji: '🏆', name: 'Pad Hunter' },
  pad_expert: { emoji: '💎', name: 'Pad Expert' },
  pad_master: { emoji: '👑', name: 'Pad Master' },
  perfect_match: { emoji: '🎯', name: 'Perfect Match' },
  weekly_warrior: { emoji: '🔥', name: 'Weekly Warrior' },
  social_butterfly: { emoji: '🦋', name: 'Social Butterfly' },
  dedicated_renter: { emoji: '📅', name: 'Dedicated Renter' },
  early_adopter: { emoji: '🌟', name: 'Early Adopter' },
};

export default function PadScoreDashboard({ padpoints, level, progress, nextLevel, streakDays, badges }) {
  const levelColor = level.level >= 4 ? COLORS.gold :
                     level.level >= 3 ? COLORS.brandOrange :
                     level.level >= 2 ? COLORS.success : COLORS.accent;

  return (
    <View style={styles.container}>
      {/* PadPoints + Level */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreLeft}>
          <Text style={[styles.pointsNumber, { color: levelColor }]}>{padpoints}</Text>
          <Text style={styles.pointsLabel}>PadPoints</Text>
        </View>
        <View style={styles.scoreRight}>
          <Text style={[styles.levelName, { color: levelColor }]}>{level.name}</Text>
          <Text style={styles.levelLabel}>PadLevel {level.level}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: levelColor }]} />
        </View>
        {nextLevel && (
          <Text style={styles.progressText}>
            {nextLevel.xpRequired - padpoints} PadPoints to {nextLevel.name}
          </Text>
        )}
      </View>

      {/* Streak */}
      {streakDays > 0 && (
        <View style={styles.streakRow}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakText}>{streakDays}-Day Swipe Streak</Text>
          {streakDays >= 3 && (
            <View style={styles.boostBadge}>
              <Text style={styles.boostText}>+{Math.min(streakDays, 7)}% Boost</Text>
            </View>
          )}
        </View>
      )}

      {/* Badges */}
      {badges && badges.length > 0 && (
        <View style={styles.badgesSection}>
          <Text style={styles.badgesTitle}>Badges</Text>
          <View style={styles.badgesGrid}>
            {badges.map((badgeKey, i) => {
              const def = BADGE_DEFS[badgeKey] || { emoji: '🏅', name: badgeKey };
              return (
                <View key={i} style={styles.badge}>
                  <Text style={styles.badgeEmoji}>{def.emoji}</Text>
                  <Text style={styles.badgeName}>{def.name}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* All Levels */}
      <View style={styles.levelsSection}>
        <Text style={styles.levelsTitle}>PadLevel Journey</Text>
        {LEVELS.map((lvl) => {
          const isReached = padpoints >= lvl.xpRequired;
          const isCurrent = lvl.level === level.level;
          return (
            <View key={lvl.level} style={[styles.levelRow, isCurrent && styles.levelRowCurrent]}>
              <Text style={[styles.levelDot, { color: isReached ? levelColor : COLORS.border }]}>
                {isReached ? '●' : '○'}
              </Text>
              <Text style={[styles.levelRowName, isReached && { color: COLORS.white }]}>
                {lvl.name}
              </Text>
              <Text style={styles.levelRowPoints}>{lvl.xpRequired} pts</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: LAYOUT.padding.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  scoreLeft: {
    alignItems: 'center',
  },
  pointsNumber: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['3xl'],
  },
  pointsLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreRight: {
    alignItems: 'flex-end',
  },
  levelName: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
  },
  levelLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  progressSection: {
    marginBottom: LAYOUT.padding.md,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: LAYOUT.radius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.radius.xs,
  },
  progressText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    marginTop: 4,
    textAlign: 'right',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.sm,
    padding: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.md,
  },
  streakIcon: {
    fontSize: 16,
  },
  streakText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brandOrange,
    flex: 1,
  },
  boostBadge: {
    backgroundColor: COLORS.success + '22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.full,
  },
  boostText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.success,
  },
  badgesSection: {
    marginBottom: LAYOUT.padding.md,
  },
  badgesTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: LAYOUT.padding.sm,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: LAYOUT.radius.full,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeName: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
  },
  levelsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: LAYOUT.padding.md,
  },
  levelsTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: LAYOUT.padding.sm,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  levelRowCurrent: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  levelDot: {
    fontSize: 12,
    width: 16,
  },
  levelRowName: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    flex: 1,
  },
  levelRowPoints: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
  },
});
