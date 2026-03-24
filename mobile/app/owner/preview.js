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
        {/* Address line */}
        <Text style={styles.addressHeader} numberOfLines={1}>{address}, {listing.city}</Text>

        {/* Hero photo with metrics + status overlay */}
        <View style={styles.pausedHero}>
          {listing.photos?.length > 0 && (
            <PhotoGallery photos={listing.photos} tierBadge={tier} />
          )}
          {/* Status banner */}
          <View style={styles.pausedOverlay}>
            <Ionicons name="pause-circle" size={24} color={COLORS.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pausedTitle}>
                {isDelisted ? 'Property Status: De-Listed' : 'Property Status: Expired'}
              </Text>
              <Text style={styles.pausedSub}>
                Not visible to tenants. Data & photos preserved. {isDelisted ? `De-listed ${delistDate}.` : 'Advertising period ended.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Re-list CTA — immediately after hero */}
        <Pressable style={({ pressed }) => [styles.relistBtn, pressed && styles.relistBtnPressed]} onPress={handleRelist}>
          <View style={styles.relistIconWrap}>
            <Ionicons name="rocket-outline" size={20} color={COLORS.white} />
          </View>
          <View>
            <Text style={styles.relistBtnTitle}>
              {isDelisted && metrics?.days_remaining > 0
                ? 'Re-List Now'
                : 'Re-List Property'}
            </Text>
            <Text style={styles.relistBtnSub}>
              {isDelisted && metrics?.days_remaining > 0
                ? `${metrics.days_remaining} advertising days remaining`
                : 'Purchase a new 30-day pass'}
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.6)" style={{ marginLeft: 'auto' }} />
        </Pressable>

        {/* Performance dashboard */}
        {metrics && (
          <View style={styles.statsDash}>
            <Text style={styles.statsDashTitle}>Listing Performance Summary</Text>

            <View style={styles.statsRow}>
              <View style={styles.statsCard}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
                <Text style={styles.statsCardValue}>{metrics.days_on_market}</Text>
                <Text style={styles.statsCardLabel}>Days on Market</Text>
              </View>
              <View style={styles.statsCard}>
                <Ionicons name="eye-outline" size={20} color={COLORS.accent} />
                <Text style={styles.statsCardValue}>{metrics.unique_views}</Text>
                <Text style={styles.statsCardLabel}>Unique Views</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statsCard}>
                <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
                <Text style={styles.statsCardValue}>{metrics.contacts}</Text>
                <Text style={styles.statsCardLabel}>Tenant Contacts</Text>
              </View>
              <View style={styles.statsCard}>
                <Ionicons name="time-outline" size={20} color={metrics.days_remaining > 0 ? COLORS.success : COLORS.textSecondary} />
                <Text style={[styles.statsCardValue, metrics.days_remaining > 0 && { color: COLORS.success }]}>
                  {metrics.days_remaining}
                </Text>
                <Text style={styles.statsCardLabel}>Days Saved</Text>
              </View>
            </View>

            {metrics.unique_views > 0 && (
              <View style={styles.insightRow}>
                <Ionicons name="trending-up" size={16} color={COLORS.brandOrange} />
                <Text style={styles.insightText}>
                  {metrics.contacts > 0
                    ? `${Math.round((metrics.contacts / metrics.unique_views) * 100)}% of viewers contacted you`
                    : `${metrics.unique_views} tenants viewed your listing`}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
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
    position: 'relative',
  },
  pausedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pausedTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.warning,
    marginBottom: 2,
  },
  pausedSub: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  metricsOverlay: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  metricChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 58,
  },
  metricChipValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  metricChipLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.success,
    borderRadius: LAYOUT.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: LAYOUT.padding.md,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  relistBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  relistIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relistBtnTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  relistBtnSub: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  addressHeader: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  // Performance dashboard
  statsDash: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsDashTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statsCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    gap: 4,
  },
  statsCardValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'] || 28,
    color: COLORS.text,
  },
  statsCardLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.brandOrange + '12',
    borderRadius: LAYOUT.radius.sm,
    padding: 10,
    marginTop: 4,
  },
  insightText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
    flex: 1,
  },
});
