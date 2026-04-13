import { useState, useCallback } from 'react';
import useAndroidBack from '../../hooks/useAndroidBack';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { BackButton } from '../../components/ui';
import { useSubscription } from '../../hooks/useSubscription';
import { useAlert } from '../../providers/AlertProvider';
import { apiFetch } from '../../lib/api';
import { TIERS } from '../../constants/tiers';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

function TierCard({ tierKey, tier, currentTier, badge, badgeColor, ctaColor, ctaTextColor, onUpgrade, upgrading, prorationCredit }) {
  const isCurrent = currentTier === tierKey;
  const isHighlighted = badge === 'Popular';
  const isUpgrade = prorationCredit > 0;
  const effectivePrice = isUpgrade
    ? Math.max(tier.price.monthly - prorationCredit, 50)
    : tier.price.monthly;
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
    if (onUpgrade && tierKey !== 'free') onUpgrade(tierKey);
  };

  return (
    <View style={[
      styles.tierCard,
      isHighlighted && styles.tierCardHighlighted,
      isCurrent && styles.tierCardCurrent,
    ]}>
      {/* Active plan banner */}
      {isCurrent && (
        <View style={styles.activeBanner}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.white} />
          <Text style={styles.activeBannerText}>Your Active Plan</Text>
        </View>
      )}

      <View style={styles.tierHeader}>
        <Text style={styles.tierLabel}>{tier.label}</Text>
        {badge && !isCurrent && (
          <View style={[styles.badge, { backgroundColor: (badgeColor || COLORS.accent) + '22' }]}>
            <Text style={[styles.badgeText, { color: badgeColor || COLORS.accent }]}>{badge}</Text>
          </View>
        )}
      </View>

      <Text style={styles.tierPrice}>{monthlyDisplay}</Text>
      {dailyDisplay && <Text style={styles.tierDaily}>({dailyDisplay})</Text>}
      {annualDisplay && <Text style={styles.tierAnnual}>{annualDisplay}</Text>}

      {/* Proration credit banner for upgrades */}
      {isUpgrade && !isCurrent && (
        <View style={styles.creditBanner}>
          <Ionicons name="pricetag" size={14} color={COLORS.success} />
          <Text style={styles.creditText}>
            ${(prorationCredit / 100).toFixed(2)} credit from your {currentTier} pass
          </Text>
        </View>
      )}
      {isUpgrade && !isCurrent && (
        <Text style={styles.creditPrice}>
          You pay today: ${(effectivePrice / 100).toFixed(2)}
        </Text>
      )}

      {tierKey === 'free' && (
        <Text style={styles.tierDesc}>1 listing &bull; Basic stats</Text>
      )}

      {tierKey === 'premium' && !isUpgrade && (
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
        <View style={styles.currentPlanBtn}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.currentPlanBtnText}>Current Plan</Text>
        </View>
      ) : tierKey !== 'free' ? (
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: ctaColor || COLORS.accent, opacity: upgrading ? 0.6 : 1 }]}
          onPress={handleSelect}
          disabled={upgrading}
        >
          {upgrading ? (
            <ActivityIndicator size="small" color={ctaTextColor || COLORS.white} />
          ) : (
            <Text style={[styles.ctaBtnText, { color: ctaTextColor || COLORS.white }]}>
              {isUpgrade ? `Upgrade to ${tier.label}` : `Select ${tier.label}`} →
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export default function UpgradeScreen() {
  useAndroidBack();
  const router = useRouter();
  const alert = useAlert();
  const { preview } = useLocalSearchParams();
  const { role } = useAuth();
  const isAdminPreview = preview === 'true' && ['admin', 'super_admin'].includes(role);
  const { tier: currentTier, daysRemaining, tierExpiresAt, refresh: refreshTier } = useSubscription();
  const [upgrading, setUpgrading] = useState(false);

  // Refresh tier when screen regains focus (e.g., returning from browser)
  useFocusEffect(
    useCallback(() => {
      refreshTier();
    }, [refreshTier])
  );

  // Calculate proration credit for upgrades (client-side estimate)
  let prorationCredit = 0;
  if (currentTier !== 'free' && daysRemaining > 0 && tierExpiresAt) {
    const currentPriceCents = TIERS[currentTier]?.price?.monthly || 0;
    prorationCredit = Math.round((daysRemaining / 30) * currentPriceCents);
  }

  const handleUpgrade = async (tier) => {
    setUpgrading(true);
    try {
      const { checkout_url } = await apiFetch('/api/owner/subscription/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier }),
      });
      if (checkout_url) {
        await WebBrowser.openBrowserAsync(checkout_url);
        // User returned from browser — refresh tier and navigate to subscription
        refreshTier();
        router.replace('/settings/subscription');
      }
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
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
          onUpgrade={handleUpgrade}
          upgrading={upgrading}
        />

        <TierCard
          tierKey="premium"
          tier={TIERS.premium}
          currentTier={currentTier}
          prorationCredit={currentTier === 'pro' ? prorationCredit : 0}
          badge="Best Value"
          badgeColor={COLORS.gold}
          ctaColor={COLORS.gold}
          ctaTextColor={COLORS.black}
          onUpgrade={handleUpgrade}
          upgrading={upgrading}
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
    paddingBottom: 80,
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
    marginBottom: 10,
    alignSelf: 'center',
  },
  activeBannerText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success + '1A',
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.success + '44',
    paddingVertical: 12,
    marginTop: LAYOUT.padding.xs,
  },
  currentPlanBtnText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.success,
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
  creditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.success + '1A',
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  creditText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
  },
  creditPrice: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginTop: 6,
    marginBottom: 4,
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
