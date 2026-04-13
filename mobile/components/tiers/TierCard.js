import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import VerifiedBadge from '../ui/VerifiedBadge';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const TIER_COLORS = {
  free: { border: COLORS.accent + '66', glow: COLORS.accent, progressFill: COLORS.accent },
  explorer: { border: COLORS.brandOrange + '66', glow: COLORS.brandOrange, progressFill: COLORS.brandOrange },
  master: { border: COLORS.gold + '66', glow: COLORS.gold, progressFill: COLORS.gold },
};

/**
 * Tier status card for the PadScore Dashboard.
 * Shows current renter tier, query usage, Verified badge, upgrade buttons.
 */
export default function TierCard({ tier, tierLabel, verified, queriesToday, dailyLimit, remainingQueries, zones, maxZones, onUpgrade }) {
  const progressPct = dailyLimit > 0 && queriesToday !== null ? Math.min(100, Math.round((queriesToday / dailyLimit) * 100)) : 0;
  const tc = TIER_COLORS[tier] || TIER_COLORS.free;

  return (
    <View style={[styles.container, { borderColor: tc.border }]}>
      {/* Tier header */}
      <View style={styles.tierRow}>
        <View style={styles.tierLeft}>
          <View style={[styles.orbRing, { borderColor: tc.glow + '88' }]}>
            <Image source={require('../../assets/images/askpad-orb.png')} style={styles.tierOrbImage} />
          </View>
          <View>
            <Text style={styles.tierLabel}>{tierLabel}</Text>
            <Text style={styles.tierSub}>AskPad Tier</Text>
          </View>
        </View>
        {verified && <VerifiedBadge size="sm" />}
      </View>

      {/* Query usage */}
      <View style={styles.usageRow}>
        <View style={styles.usageLeft}>
          <Ionicons name="chatbubble-outline" size={14} color={tc.progressFill} />
          <Text style={styles.usageLabel}>Queries Today</Text>
        </View>
        <Text style={[styles.usageCount, { color: tc.progressFill }]}>
          {remainingQueries === null ? '...' : remainingQueries >= 999 ? 'Unlimited' : `${remainingQueries} remaining`}
        </Text>
      </View>
      {tier !== 'master' && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: tc.progressFill }]} />
        </View>
      )}

      {/* Zones */}
      <View style={styles.zonesRow}>
        <Ionicons name="location" size={14} color={tc.progressFill} />
        <Text style={styles.zonesText}>{zones} of {maxZones} search zones</Text>
      </View>

      {/* Upgrade button (if not Master) */}
      {tier !== 'master' && (
        <TouchableOpacity onPress={onUpgrade} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF8C42', COLORS.brandOrange, '#C94A1E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upgradeButton}
          >
            <Ionicons name="rocket-outline" size={16} color={COLORS.white} />
            <Text style={styles.upgradeText}>
              {tier === 'free' ? 'Upgrade AskPad' : 'Upgrade to Pad Master'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    borderWidth: 1.5,
    marginBottom: LAYOUT.padding.md,
    // Elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orbRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  tierOrbImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  tierLabel: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  tierSub: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    marginTop: 1,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  usageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usageLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  usageCount: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.xs,
  },
  progressTrack: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: LAYOUT.radius.full,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.radius.full,
  },
  zonesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  zonesText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 13,
  },
  upgradeText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
