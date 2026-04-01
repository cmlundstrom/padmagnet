import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import VerifiedBadge from '../ui/VerifiedBadge';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Tier status card for the PadScore Dashboard.
 * Shows current renter tier, query usage, Verified badge, upgrade buttons.
 */
export default function TierCard({ tier, tierLabel, verified, queriesToday, dailyLimit, remainingQueries, zones, maxZones, onUpgrade }) {
  const progressPct = dailyLimit > 0 && queriesToday !== null ? Math.min(100, Math.round((queriesToday / dailyLimit) * 100)) : 0;

  return (
    <View style={styles.container}>
      {/* Tier header */}
      <View style={styles.tierRow}>
        <View style={styles.tierLeft}>
          <Image source={require('../../assets/images/askpad-orb.png')} style={styles.tierOrbImage} />
          <Text style={styles.tierLabel}>{tierLabel}</Text>
        </View>
        {verified && <VerifiedBadge size="sm" />}
      </View>

      {/* Query usage */}
      <View style={styles.usageRow}>
        <Text style={styles.usageLabel}>AskPad Queries Today</Text>
        <Text style={styles.usageCount}>
          {remainingQueries === null ? '…' : remainingQueries >= 999 ? 'Unlimited' : `${remainingQueries} remaining`}
        </Text>
      </View>
      {tier !== 'master' && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      )}

      {/* Zones */}
      <View style={styles.zonesRow}>
        <Ionicons name="location" size={14} color={COLORS.slate} />
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
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: LAYOUT.padding.md,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  tierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  usageLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  usageCount: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: LAYOUT.radius.xs,
    overflow: 'hidden',
    marginBottom: LAYOUT.padding.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.xs,
  },
  zonesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: LAYOUT.padding.sm,
  },
  zonesText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: 12,
  },
  upgradeText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
