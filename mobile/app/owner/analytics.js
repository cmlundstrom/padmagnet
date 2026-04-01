import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { shareListing } from '../../lib/share-listing';
import { useSubscription } from '../../hooks/useSubscription';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function AnalyticsScreen() {
  const { listing_id } = useLocalSearchParams();
  const { tier, canViewAnalytics, tierLabel } = useSubscription();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!listing_id || !canViewAnalytics) {
      setLoading(false);
      return;
    }
    apiFetch(`/api/owner/analytics/${listing_id}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [listing_id, canViewAnalytics]);

  async function handleShare() {
    await shareListing(data || { id: listing_id });
  }

  function handleEdit() {
    router.push(`/owner/edit?draft_id=${listing_id}`);
  }

  // -- Paywall overlay for free tier --
  if (!canViewAnalytics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.backButton}>
          <BackButton />
          <Text style={styles.backText}>Listing Performance</Text>
        </View>

        <View style={styles.paywallContainer}>
          <Ionicons name="lock-closed" size={48} color={COLORS.brandOrange} />
          <Text style={styles.paywallTitle}>Analytics is a Pro Feature</Text>
          <Text style={styles.paywallBody}>
            Upgrade to Pro or Premium to unlock detailed listing analytics including views, saves,
            swipe breakdowns, and more.
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/owner/upgrade')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.backButton}>
          <BackButton />
          <Text style={styles.backText}>Listing Performance</Text>
        </View>
        <Text style={styles.errorText}>{error || 'Unable to load analytics.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.backButton}>
        <BackButton />
        <Text style={styles.backText}>Listing Performance</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 360 }}
      >
        {/* Address + listing age */}
        <Text style={styles.address}>
          {data.address}{data.city ? `, ${data.city}` : ''}
        </Text>
        <Text style={styles.listedAgo}>
          Listed {data.days_on_market} {data.days_on_market === 1 ? 'day' : 'days'} ago
        </Text>

        {/* Stat cards row */}
        <View style={styles.statRow}>
          <StatCard value={data.unique_views} label="Views" />
          <StatCard value={data.right_swipes} label="Saves" />
          <StatCard value={data.conversations} label="Chats" />
        </View>

        {/* Swipe breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Swipe Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Ionicons name="arrow-forward-circle" size={18} color={COLORS.success} />
            <Text style={styles.breakdownText}>Right (interested): {data.right_swipes}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Ionicons name="arrow-back-circle" size={18} color={COLORS.danger} />
            <Text style={styles.breakdownText}>Left (passed): {data.left_swipes}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Ionicons name="stats-chart" size={18} color={COLORS.brandOrange} />
            <Text style={styles.breakdownText}>Save rate: {data.save_rate}%</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Share Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color={COLORS.accent} />
            <Text style={styles.actionButtonTextSecondary}>Edit Listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: LAYOUT.padding.md,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  address: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
    marginBottom: 4,
  },
  listedAgo: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.padding.lg,
  },

  // Stat cards
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: LAYOUT.padding.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: LAYOUT.padding.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.text,
  },
  statLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Swipe breakdown
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  breakdownText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 14,
  },
  actionButtonTextSecondary: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
  },

  // Error
  errorText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: LAYOUT.padding.xl,
  },

  // Paywall
  paywallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
  },
  paywallTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginTop: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
  },
  paywallBody: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: LAYOUT.padding.lg,
  },
  upgradeButton: {
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    paddingHorizontal: LAYOUT.padding.xl,
  },
  upgradeButtonText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
