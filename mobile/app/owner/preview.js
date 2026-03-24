import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/ui';
import { PhotoGallery, PadScoreBreakdown, ListingInfo } from '../../components/listing';
import { calculatePadScore } from '../../lib/padscore';
import { apiFetch } from '../../lib/api';
import { shareListing } from '../../lib/share-listing';
import { useSubscription } from '../../hooks/useSubscription';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function PreviewScreen() {
  const { listing_id } = useLocalSearchParams();
  const router = useRouter();
  const alert = useAlert();
  const { tier } = useSubscription();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (!listing_id) return;
    (async () => {
      try {
        // Fetch from owner endpoint to get all fields including status
        const ownerData = await apiFetch('/api/owner/listings');
        const match = (ownerData || []).find(l => l.id === listing_id);
        if (match) {
          setListing(match);
          // Calculate metrics
          const dom = match.created_at
            ? Math.max(1, Math.floor((Date.now() - new Date(match.created_at).getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          setMetrics({
            days_on_market: dom,
            unique_views: match.unique_view_count || 0,
            contacts: match.inquiry_count || 0,
            days_remaining: match.days_remaining_at_delist || 0,
          });
        } else {
          // Fallback to public endpoint
          const data = await apiFetch(`/api/listings/${listing_id}`);
          setListing(data);
        }
      } catch (e) {
        try {
          const data = await apiFetch(`/api/listings/${listing_id}`);
          setListing(data);
        } catch (_) { /* ignore */ }
      } finally {
        setLoading(false);
      }
    })();
  }, [listing_id]);

  const handleShare = useCallback(() => shareListing(listing), [listing]);

  const handleRelist = async () => {
    try {
      const result = await apiFetch(`/api/owner/listings/${listing_id}/relist`, { method: 'POST' });
      if (result.action === 'resumed') {
        alert('Listing Re-Activated', `Your listing is live again with ${result.days_remaining} days remaining.`);
        router.back();
      } else if (result.action === 'payment_required') {
        router.push('/owner/upgrade');
      }
    } catch (err) {
      alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>Listing not found</Text>
      </SafeAreaView>
    );
  }

  const isDelisted = listing.status === 'leased';
  const isExpired = listing.status === 'expired';
  const isPaused = isDelisted || isExpired;

  // Active listing — show tenant preview
  if (!isPaused) {
    const sampleScore = calculatePadScore(null, listing);
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          title="Preview as Tenant"
          showBack
          rightAction={
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <FontAwesome name="share-alt" size={14} color={COLORS.background} />
              <Text style={styles.shareBtnText}>Share</Text>
            </Pressable>
          }
        />
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>This is how tenants will see your listing</Text>
        </View>
        <ScrollView style={styles.scroll}>
          {listing.photos?.length > 0 && (
            <PhotoGallery photos={listing.photos} tierBadge={tier} />
          )}
          <PadScoreBreakdown padScore={sampleScore} />
          <ListingInfo listing={listing} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // De-listed or expired — show paused dashboard
  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const delistDate = listing.updated_at
    ? new Date(listing.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Recently';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Listing Paused" showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: LAYOUT.padding.md }}>
        {/* Hero photo */}
        {listing.photos?.length > 0 && (
          <View style={styles.pausedHero}>
            <PhotoGallery photos={listing.photos} tierBadge={tier} />
          </View>
        )}

        {/* Status banner */}
        <View style={styles.pausedBanner}>
          <Ionicons name="pause-circle" size={22} color={COLORS.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pausedTitle}>
              {isDelisted ? 'Listing De-Listed' : 'Listing Expired'}
            </Text>
            <Text style={styles.pausedSub}>
              Tenants cannot see this listing. {isDelisted ? `De-listed ${delistDate}.` : 'Your advertising period has ended.'}
            </Text>
          </View>
        </View>

        {/* Performance metrics */}
        {metrics && (
          <View style={styles.metricsCard}>
            <Text style={styles.metricsTitle}>Listing Performance</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <FontAwesome name="calendar" size={16} color={COLORS.accent} />
                <Text style={styles.metricValue}>{metrics.days_on_market}</Text>
                <Text style={styles.metricLabel}>Days on Market</Text>
              </View>
              <View style={styles.metricItem}>
                <FontAwesome name="eye" size={16} color={COLORS.accent} />
                <Text style={styles.metricValue}>{metrics.unique_views}</Text>
                <Text style={styles.metricLabel}>Unique Views</Text>
              </View>
              <View style={styles.metricItem}>
                <FontAwesome name="envelope-o" size={16} color={COLORS.accent} />
                <Text style={styles.metricValue}>{metrics.contacts}</Text>
                <Text style={styles.metricLabel}>Contacts</Text>
              </View>
              {metrics.days_remaining > 0 && (
                <View style={styles.metricItem}>
                  <FontAwesome name="clock-o" size={16} color={COLORS.success} />
                  <Text style={[styles.metricValue, { color: COLORS.success }]}>{metrics.days_remaining}</Text>
                  <Text style={styles.metricLabel}>Days Saved</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Preserved data notice */}
        <View style={styles.preservedCard}>
          <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} />
          <Text style={styles.preservedText}>
            Your listing data, photos, and conversations are preserved. Re-list anytime with one tap.
          </Text>
        </View>

        {/* Re-list CTA */}
        <Pressable style={styles.relistBtn} onPress={handleRelist}>
          <Ionicons name="refresh" size={20} color={COLORS.white} />
          <Text style={styles.relistBtnText}>
            {isDelisted && metrics?.days_remaining > 0
              ? `Re-List Now — ${metrics.days_remaining} days remaining`
              : 'Re-List — Purchase New Pass'}
          </Text>
        </Pressable>

        {/* Address footer */}
        <Text style={styles.addressFooter}>{address}, {listing.city}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  previewBanner: {
    backgroundColor: COLORS.accent + '15',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  previewBannerText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
  },
  scroll: {
    flex: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },

  // Paused state
  pausedHero: {
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    marginBottom: LAYOUT.padding.md,
    opacity: 0.7,
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.warning + '15',
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
  },
  pausedTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.warning,
    marginBottom: 2,
  },
  pausedSub: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  metricsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
  },
  metricsTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    width: '46%',
    alignItems: 'center',
    backgroundColor: COLORS.background + 'AA',
    borderRadius: LAYOUT.radius.md,
    padding: 12,
    gap: 4,
  },
  metricValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
  },
  metricLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
  },
  preservedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.accent + '12',
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.lg,
  },
  preservedText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    flex: 1,
    lineHeight: 20,
  },
  relistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    borderRadius: LAYOUT.radius.full,
    paddingVertical: 14,
    marginBottom: LAYOUT.padding.md,
  },
  relistBtnText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  addressFooter: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
});
