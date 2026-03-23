import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { TIERS } from '../../constants/tiers';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const TIER_COLORS = {
  free: COLORS.textSecondary,
  pro: COLORS.accent,
  premium: COLORS.gold,
};

const TIER_ICONS = {
  free: 'leaf-outline',
  pro: 'shield-checkmark',
  premium: 'diamond',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SubscriptionScreen() {
  const {
    tier, tierLabel, tierExpiresAt, tierStartedAt,
    daysRemaining, isExpired,
  } = useSubscription();

  const isFree = tier === 'free';
  const isPro = tier === 'pro';
  const isPremium = tier === 'premium';
  const tierColor = TIER_COLORS[tier];
  const tierIcon = TIER_ICONS[tier];
  const tierDef = TIERS[tier] || TIERS.free;

  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        <Text style={styles.backText}>Subscription</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ── Plan Card ────────────────────────────── */}
        <View style={[
          styles.planCard,
          !isFree && !isExpired && styles.planCardActive,
          { borderColor: !isFree && !isExpired ? COLORS.success : tierColor + '44' },
        ]}>
          {/* Active plan banner */}
          {!isFree && !isExpired && (
            <View style={styles.activeBanner}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
              <Text style={styles.activeBannerText}>Your Active Plan</Text>
            </View>
          )}

          <View style={[styles.badgeCircle, { backgroundColor: tierColor + '22' }]}>
            <Ionicons name={tierIcon} size={32} color={tierColor} />
          </View>

          <Text style={styles.planLabel}>Your Plan</Text>
          <Text style={[styles.planTier, { color: tierColor }]}>{tierLabel}</Text>

          {!isFree && tierDef.price?.monthly > 0 && (
            <Text style={styles.planPrice}>
              ${(tierDef.price.monthly / 100).toFixed(2)} · 30-day pass
            </Text>
          )}

          {/* Expiry countdown */}
          {!isFree && daysRemaining !== null && !isExpired && (
            <View style={[
              styles.expiryPill,
              isUrgent && styles.expiryPillUrgent,
            ]}>
              <Ionicons
                name={isUrgent ? 'warning' : 'time-outline'}
                size={14}
                color={isUrgent ? COLORS.warning : COLORS.textSecondary}
              />
              <Text style={[
                styles.expiryText,
                isUrgent && styles.expiryTextUrgent,
              ]}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </Text>
            </View>
          )}

          {isExpired && (
            <View style={[styles.expiryPill, styles.expiryPillExpired]}>
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={[styles.expiryText, { color: COLORS.danger }]}>
                Pass expired
              </Text>
            </View>
          )}

          {/* Active date range */}
          {!isFree && tierStartedAt && (
            <Text style={styles.dateRange}>
              {formatDate(tierStartedAt)} — {formatDate(tierExpiresAt)}
            </Text>
          )}
        </View>

        {/* ── Included Features ────────────────────── */}
        {!isFree && (
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>
              {"What's included in " + tierLabel}
            </Text>
            {tierDef.features.map((feat, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Free Tier: Upgrade CTA ──────────────── */}
        {isFree && (
          <>
            <Text style={styles.freePrompt}>
              Unlock analytics, priority placement, badges, and more.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => router.push('/owner/upgrade')}
            >
              <Ionicons name="star" size={20} color={COLORS.white} />
              <Text style={styles.upgradeBtnText}>View Plans & Upgrade</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Pro → Premium Upsell ─────────────────── */}
        {isPro && !isExpired && (
          <View style={styles.upsellCard}>
            <View style={styles.upsellHeader}>
              <Ionicons name="diamond" size={22} color={COLORS.gold} />
              <Text style={styles.upsellTitle}>Upgrade to Premium</Text>
            </View>

            <Text style={styles.upsellPrice}>
              $9.99/mo — just $5 more
            </Text>

            <View style={styles.upsellFeatures}>
              {[
                'Unlimited active listings',
                'Featured gold badge — stand out in the feed',
                'Instant push to matched tenants',
                'Lead contact export (CSV)',
                'Custom branding on listings',
              ].map((feat, i) => (
                <View key={i} style={styles.upsellFeatureRow}>
                  <Ionicons name="add-circle" size={16} color={COLORS.gold} />
                  <Text style={styles.upsellFeatureText}>{feat}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.upsellBtn}
              onPress={() => router.push('/owner/upgrade')}
            >
              <Text style={styles.upsellBtnText}>Upgrade to Premium →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Expired: Renew CTA ───────────────────── */}
        {isExpired && (
          <TouchableOpacity
            style={styles.renewBtn}
            onPress={() => router.push('/owner/upgrade')}
          >
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.renewBtnText}>Renew Your Pass</Text>
          </TouchableOpacity>
        )}

        {/* ── Premium: You're at the top ───────────── */}
        {isPremium && !isExpired && (
          <View style={styles.topTierCard}>
            <Ionicons name="trophy" size={28} color={COLORS.gold} />
            <Text style={styles.topTierText}>
              You have our best plan. Every feature is unlocked.
            </Text>
          </View>
        )}

        {/* ── Help ─────────────────────────────────── */}
        <View style={styles.helpRow}>
          <Ionicons name="help-circle-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.helpText}>
            Questions about your plan? Contact support@padmagnet.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: LAYOUT.padding.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.lg,
    gap: 8,
  },
  backText: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },

  // ── Plan card ──────────────────────────────────
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1.5,
    padding: LAYOUT.padding.lg,
    alignItems: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  planCardActive: {
    borderWidth: 2,
    backgroundColor: COLORS.success + '0D',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.success,
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignSelf: 'center',
  },
  activeBannerText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  planLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  planTier: {
    fontFamily: FONTS.heading.bold,
    fontSize: 32,
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: LAYOUT.radius.full,
    marginTop: 4,
  },
  expiryPillUrgent: {
    backgroundColor: COLORS.warning + '1A',
  },
  expiryPillExpired: {
    backgroundColor: COLORS.danger + '1A',
  },
  expiryText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  expiryTextUrgent: {
    color: COLORS.warning,
  },
  dateRange: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 8,
    opacity: 0.7,
  },

  // ── Features card ──────────────────────────────
  featuresCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
  },
  featuresTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  featureText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },

  // ── Free tier ──────────────────────────────────
  freePrompt: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: LAYOUT.padding.lg,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    marginBottom: LAYOUT.padding.md,
  },
  upgradeBtnText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },

  // ── Upsell card ────────────────────────────────
  upsellCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
  },
  upsellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  upsellTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.gold,
  },
  upsellPrice: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  upsellFeatures: {
    marginBottom: 14,
  },
  upsellFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  upsellFeatureText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  upsellBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  upsellBtnText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: '#000000',
  },

  // ── Renew / Top tier ───────────────────────────
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    marginBottom: LAYOUT.padding.md,
  },
  renewBtnText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  topTierCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gold + '33',
    padding: LAYOUT.padding.lg,
    alignItems: 'center',
    gap: 10,
    marginBottom: LAYOUT.padding.md,
  },
  topTierText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Help ───────────────────────────────────────
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: LAYOUT.padding.sm,
    marginTop: LAYOUT.padding.sm,
  },
  helpText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
