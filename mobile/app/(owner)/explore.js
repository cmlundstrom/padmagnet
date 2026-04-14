import { useRef, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EqualHousingBadge } from '../../components/ui';
import OwnerHeader from '../../components/owner/OwnerHeader';
import MarketStats from '../../components/owner/MarketStats';
import UpgradeCTA from '../../components/owner/UpgradeCTA';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

const TIER_COLORS = { free: COLORS.textSecondary, pro: COLORS.accent, premium: COLORS.gold };
const TIER_ICONS = { free: 'leaf-outline', pro: 'shield-checkmark', premium: 'diamond' };

export default function ExploreScreen() {
  const router = useRouter();
  const { isAnon } = useAuth();
  const { tier, tierLabel, daysRemaining, isExpired } = useSubscription();
  const isFree = tier === 'free';
  const isPro = tier === 'pro';
  const isPremium = tier === 'premium';
  const tierColor = TIER_COLORS[tier];
  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

  // Pulsing glow for the Nearby Rentals card
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <OwnerHeader minimal />
      <Text style={styles.header}>Explore Your Market</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero hook card for anonymous owners */}
        {isAnon && (
          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.9 }]}
            onPress={() => router.push('/owner/nearby-rentals')}
          >
            <LinearGradient
              colors={['#1E3A5F', '#234170', '#2C5288']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Ionicons name="search" size={28} color={COLORS.brandOrange} />
              <Text style={styles.heroTitle}>Wondering what your property could rent for?</Text>
              <Text style={styles.heroSubtitle}>
                See what similar homes in your area are actually renting for right now.
              </Text>
              <View style={styles.heroCtaRow}>
                <Text style={styles.heroCtaText}>Explore Nearby Rentals</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
              </View>
            </LinearGradient>
          </Pressable>
        )}

        {/* Nearby Rentals — hero card */}
        <Pressable
          style={({ pressed }) => [pressed && { opacity: 0.92 }]}
          onPress={() => router.push('/owner/nearby-rentals')}
        >
          <LinearGradient
            colors={['#1A3358', '#234170', '#2C5288']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nearbyCard}
          >
            <Animated.View style={[styles.nearbyGlow, { opacity: glowOpacity }]} />
            <View style={styles.nearbyPinCircle}>
              <Ionicons name="navigate" size={28} color={COLORS.white} />
            </View>
            <Text style={styles.nearbyTitle}>Nearby Rentals</Text>
            <Text style={styles.nearbySubtitle}>
              Scout your competition — see what's listed near you right now
            </Text>
            <View style={styles.nearbyCtaRow}>
              <LinearGradient
                colors={[COLORS.logoOrange, '#D14E2F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nearbyCtaBtn}
              >
                <Ionicons name="compass-outline" size={16} color={COLORS.white} />
                <Text style={styles.nearbyCtaText}>Explore the Map</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Market Snapshot */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionTitle}>Market Snapshot</Text>
        </View>
        <MarketStats />

        {/* Your Plan — hidden for anonymous users */}
        {!isAnon && (
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionTitle}>Your Plan</Text>
        </View>
        )}

        {/* Plan status card — hidden for anon */}
        {!isAnon && <Pressable
          style={({ pressed }) => [
            styles.planCard,
            { borderColor: tierColor + '44' },
            pressed && styles.cardPressed,
          ]}
          onPress={() => router.push('/settings/subscription')}
        >
          <View style={styles.planRow}>
            <View style={[styles.planBadge, { backgroundColor: tierColor + '22' }]}>
              <Ionicons name={TIER_ICONS[tier]} size={24} color={tierColor} />
            </View>
            <View style={styles.planInfo}>
              <Text style={[styles.planTierText, { color: tierColor }]}>{tierLabel}</Text>
              {!isFree && daysRemaining !== null && !isExpired && (
                <Text style={[
                  styles.planExpiry,
                  isUrgent && { color: COLORS.warning },
                ]}>
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </Text>
              )}
              {isExpired && (
                <Text style={[styles.planExpiry, { color: COLORS.danger }]}>Pass expired</Text>
              )}
              {isFree && (
                <Text style={styles.planExpiry}>Free plan</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </View>
        </Pressable>}

        {/* Upgrade CTA for free users */}
        {!isAnon && isFree && <UpgradeCTA />}

        {/* Premium upsell for Pro users */}
        {!isAnon && isPro && !isExpired && (
          <Pressable
            style={({ pressed }) => [styles.upsellCard, pressed && styles.cardPressed]}
            onPress={() => router.push('/owner/upgrade')}
          >
            <View style={styles.upsellRow}>
              <Ionicons name="diamond" size={20} color={COLORS.gold} />
              <View style={styles.upsellTextWrap}>
                <Text style={styles.upsellTitle}>Upgrade to Premium</Text>
                <Text style={styles.upsellSub}>
                  Unlimited listings, gold badge, instant push — just $5 more
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gold} />
            </View>
          </Pressable>
        )}

        {/* Premium — top tier confirmation */}
        {!isAnon && isPremium && !isExpired && (
          <View style={styles.topTierRow}>
            <Ionicons name="trophy" size={16} color={COLORS.gold} />
            <Text style={styles.topTierText}>Every feature unlocked</Text>
          </View>
        )}

        <EqualHousingBadge style={{ marginTop: 16, marginBottom: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.sm,
    paddingBottom: LAYOUT.padding.sm,
  },
  heroCard: {
    borderRadius: LAYOUT.radius.xl,
    padding: LAYOUT.padding.lg,
    marginBottom: LAYOUT.padding.md,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.brandOrange + '44',
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  heroCtaText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  scrollContent: {
    padding: LAYOUT.padding.md,
    paddingTop: 0,
    paddingBottom: 12,
    gap: 12,
  },
  // ── Nearby Rentals hero card ───────────────────
  nearbyCard: {
    borderRadius: LAYOUT.radius.xl,
    padding: LAYOUT.padding.lg,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.logoOrange + '55',
    overflow: 'hidden',
  },
  nearbyGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.logoOrange,
  },
  nearbyPinCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.logoOrange + '33',
    borderWidth: 2,
    borderColor: COLORS.logoOrange + '66',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nearbyTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.white,
  },
  nearbySubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: LAYOUT.padding.md,
  },
  nearbyCtaRow: {
    marginTop: 8,
  },
  nearbyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: LAYOUT.radius.full,
  },
  nearbyCtaText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sectionLabel: {
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: 4,
  },

  // ── Plan status card ───────────────────────────
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1.5,
    padding: LAYOUT.padding.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planTierText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
  },
  planExpiry: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // ── Premium upsell ────────────────────────────
  upsellCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
    padding: LAYOUT.padding.md,
  },
  upsellRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upsellTextWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  upsellTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.gold,
  },
  upsellSub: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── Top tier ──────────────────────────────────
  topTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: LAYOUT.padding.sm,
  },
  topTierText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gold,
  },
});
