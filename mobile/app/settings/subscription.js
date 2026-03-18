import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function SubscriptionScreen() {
  const { tier, tierLabel } = useSubscription();
  const isFree = tier === 'free';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        <Text style={styles.backText}>Subscription</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 360 }}
      >
        {/* Current plan */}
        <View style={styles.planCard}>
          <Text style={styles.planLabel}>Your Plan</Text>
          <Text style={styles.planTier}>{tierLabel}</Text>
        </View>

        {isFree ? (
          <>
            <Text style={styles.upgradePrompt}>
              Upgrade to unlock analytics, priority placement, and more.
            </Text>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/owner/upgrade')}
            >
              <Ionicons name="star" size={20} color={COLORS.white} />
              <Text style={styles.upgradeButtonText}>Upgrade to Pro — $4.99/mo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.upgradeButtonPremium}
              onPress={() => router.push('/owner/upgrade')}
            >
              <Ionicons name="diamond" size={20} color={COLORS.gold} />
              <Text style={styles.upgradeButtonPremiumText}>Upgrade to Premium — $9.99/mo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.renewalText}>
              Your plan renews N/A — Stripe not connected
            </Text>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => Alert.alert('Coming Soon', 'Subscription management will be available after Stripe integration.')}
            >
              <Ionicons name="settings-outline" size={20} color={COLORS.accent} />
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => Alert.alert('Coming Soon', 'Subscription cancellation will be available after Stripe integration.')}
            >
              <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </>
        )}
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

  // Plan card
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.lg,
    alignItems: 'center',
    marginBottom: LAYOUT.padding.lg,
  },
  planLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  planTier: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.brandOrange,
  },

  // Free tier
  upgradePrompt: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: LAYOUT.padding.lg,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  upgradeButtonPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 14,
    marginBottom: 12,
  },
  upgradeButtonPremiumText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.gold,
  },

  // Paid tier
  renewalText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.lg,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 14,
    marginBottom: 12,
  },
  manageButtonText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.danger,
  },
});
