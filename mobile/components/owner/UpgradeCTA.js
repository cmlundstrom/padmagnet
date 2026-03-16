import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { TIERS } from '../../constants/tiers';

export default function UpgradeCTA({ variant = 'card', targetTier = 'pro' }) {
  const router = useRouter();
  const { tier } = useSubscription();

  // Don't show if already at or above target tier
  const tierOrder = ['free', 'pro', 'premium'];
  if (tierOrder.indexOf(tier) >= tierOrder.indexOf(targetTier)) return null;

  const target = TIERS[targetTier];
  const pricePerDay = (target.price.monthly / 30).toFixed(0);

  if (variant === 'inline') {
    return (
      <TouchableOpacity
        style={styles.inlineContainer}
        onPress={() => router.push('/owner/upgrade')}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-up-circle" size={LAYOUT.iconSize.lg} color={COLORS.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.inlineTitle}>Upgrade to {target.label}</Text>
          <Text style={styles.inlineHint}>Just {pricePerDay}¢/day</Text>
        </View>
        <Ionicons name="chevron-forward" size={LAYOUT.iconSize.md} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  }

  // Card variant (default)
  return (
    <View style={styles.cardContainer}>
      <Text style={styles.cardTitle}>Upgrade to {target.label}</Text>
      <Text style={styles.cardSubtitle}>
        Get more from your listing for just {pricePerDay}¢/day
      </Text>
      {target.features.slice(0, 4).map((feat, i) => (
        <View key={i} style={styles.featureRow}>
          <Ionicons name="checkmark" size={LAYOUT.iconSize.md} color={COLORS.success} />
          <Text style={styles.featureText}>{feat}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/owner/upgrade')}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>
          Upgrade — ${(target.price.monthly / 100).toFixed(2)}/mo
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Card variant
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
    padding: LAYOUT.padding.md,
  },
  cardTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.xs,
  },
  cardSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.padding.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.sm,
  },
  featureText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: LAYOUT.padding.sm + 4,
    alignItems: 'center',
    marginTop: LAYOUT.padding.sm,
  },
  ctaText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },

  // Inline variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.padding.md,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.md,
  },
  inlineTitle: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  inlineHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
