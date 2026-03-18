import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { TIERS } from '../../constants/tiers';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

function TierCard({ tierKey, tier, currentTier, badge, badgeColor, ctaColor, ctaTextColor }) {
  const isCurrent = currentTier === tierKey;
  const isHighlighted = badge === 'Popular';
  const monthlyDisplay = tier.price.monthly === 0
    ? 'FREE'
    : `$${(tier.price.monthly / 100).toFixed(2)}/mo`;
  const dailyDisplay = tier.price.monthly > 0
    ? `just ${Math.round(tier.price.monthly / 30)}¢/day`
    : null;
  const annualDisplay = tier.price.annual > 0
    ? `Save 20% annual: $${(tier.price.annual / 100 / 12).toFixed(2)}/mo`
    : null;

  const handleSelect = () => {
    Alert.alert('Coming Soon', 'Coming soon — Stripe not yet connected');
  };

  return (
    <View style={[
      styles.tierCard,
      isHighlighted && styles.tierCardHighlighted,
      isCurrent && styles.tierCardCurrent,
    ]}>
      <View style={styles.tierHeader}>
        <Text style={styles.tierLabel}>{tier.label}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: (badgeColor || COLORS.accent) + '22' }]}>
            <Text style={[styles.badgeText, { color: badgeColor || COLORS.accent }]}>{badge}</Text>
          </View>
        )}
      </View>

      <Text style={styles.tierPrice}>{monthlyDisplay}</Text>
      {dailyDisplay && <Text style={styles.tierDaily}>({dailyDisplay})</Text>}
      {annualDisplay && <Text style={styles.tierAnnual}>{annualDisplay}</Text>}

      {tierKey === 'free' && (
        <Text style={styles.tierDesc}>1 listing &bull; Basic stats</Text>
      )}

      {tierKey === 'premium' && (
        <Text style={styles.tierDesc}>Everything in Pro, plus:</Text>
      )}

      <View style={styles.featureList}>
        {tier.features.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark" size={16} color={COLORS.success} />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>

      {isCurrent ? (
        <View style={[styles.ctaBtn, { backgroundColor: COLORS.slate + '33' }]}>
          <Text style={[styles.ctaBtnText, { color: COLORS.textSecondary }]}>Current Plan</Text>
        </View>
      ) : tierKey !== 'free' ? (
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: ctaColor || COLORS.accent }]}
          onPress={handleSelect}
        >
          <Text style={[styles.ctaBtnText, { color: ctaTextColor || COLORS.white }]}>
            Select {tier.label} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function UpgradeScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams();
  const { role } = useAuth();
  const isAdminPreview = preview === 'true' && ['admin', 'super_admin'].includes(role);
  const { tier: currentTier } = useSubscription();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isAdminPreview && (
          <View style={styles.previewBanner}>
            <Text style={styles.previewBannerText}>Admin Preview Mode</Text>
          </View>
        )}
        <TierCard
          tierKey="free"
          tier={TIERS.free}
          currentTier={currentTier}
          badge={currentTier === 'free' ? 'Current Plan' : null}
          badgeColor={COLORS.slate}
        />

        <TierCard
          tierKey="pro"
          tier={TIERS.pro}
          currentTier={currentTier}
          badge="Popular"
          badgeColor={COLORS.accent}
          ctaColor={COLORS.accent}
          ctaTextColor={COLORS.white}
        />

        <TierCard
          tierKey="premium"
          tier={TIERS.premium}
          currentTier={currentTier}
          badge="Best Value"
          badgeColor={COLORS.gold}
          ctaColor={COLORS.gold}
          ctaTextColor={COLORS.black}
        />

        <Text style={styles.footerCompare}>
          Others charge more for less: Zillow $39.99 &bull; Avail $9/unit &bull; Apartments.com $349/listing
        </Text>

        <View style={styles.footerLock}>
          <Ionicons name="lock-closed" size={14} color={COLORS.textSecondary} />
          <Text style={styles.footerLockText}>Cancel anytime. No contracts.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  previewBanner: {
    backgroundColor: COLORS.warning + '33',
    borderRadius: LAYOUT.radius.sm,
    padding: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.md,
    alignItems: 'center',
  },
  previewBannerText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: 60,
  },

  // ── Tier card ──────────────────────────────────────────────
  tierCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
  },
  tierCardHighlighted: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  tierCardCurrent: {
    borderColor: COLORS.success,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.padding.sm,
  },
  tierLabel: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: LAYOUT.radius.full,
  },
  badgeText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
  },
  tierPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
  },
  tierDaily: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  tierAnnual: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    marginBottom: LAYOUT.padding.sm,
  },
  tierDesc: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: LAYOUT.padding.sm,
  },
  featureList: {
    marginBottom: LAYOUT.padding.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  ctaBtn: {
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: LAYOUT.padding.xs,
  },
  ctaBtnText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
  },

  // ── Footer ─────────────────────────────────────────────────
  footerCompare: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.md,
    lineHeight: 18,
  },
  footerLock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: LAYOUT.padding.lg,
  },
  footerLockText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
