import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Header } from '../../components/ui';
import { PhotoGallery, PadScoreBreakdown, ListingInfo, MLSDisclaimer } from '../../components/listing';
import usePreferences from '../../hooks/usePreferences';
import { calculatePadScore } from '../../lib/padscore';
import { FontAwesome } from '@expo/vector-icons';
import { apiFetch } from '../../lib/api';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams();
  const alert = useAlert();
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { preferences } = usePreferences();

  useEffect(() => {
    let cancelled = false;

    async function fetchListing() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch(`/api/listings/${id}`);
        if (!cancelled) setListing(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchListing();
    return () => { cancelled = true; };
  }, [id]);

  const padScore = listing ? calculatePadScore(preferences, listing) : null;

  const handleShare = useCallback(async () => {
    if (!listing) return;
    const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
    const price = listing.list_price ? `$${Number(listing.list_price).toLocaleString()}/mo` : '';
    try {
      await Share.share({
        message: `Check out this rental on PadMagnet! ${address}, ${listing.city} — ${price}\nhttps://padmagnet.com/listing/${listing.id}`,
      });
    } catch (_) {}
  }, [listing]);

  const handleContact = async () => {
    if (!listing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await apiFetch('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listing.id,
          initial_message: `Hi, I'm interested in the listing at ${[listing.street_number, listing.street_name].filter(Boolean).join(' ')}. Is it still available?`,
        }),
      });
      router.push(`/conversation/${result.id}`);
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

  if (error || !listing) {
    return (
      <SafeAreaView style={styles.centered}>
        <Header title="Error" showBack />
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>{error || 'Listing not found'}</Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Details"
        showBack
        rightAction={
          <Pressable onPress={handleShare} style={styles.shareBtnWide}>
            <FontAwesome name="share-alt" size={17} color={COLORS.white} />
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        }
      />

      <ScrollView style={styles.scroll} bounces={false}>
        <PhotoGallery photos={listing.photos || []} />
        <PadScoreBreakdown padScore={padScore} />
        <ListingInfo listing={listing} />
        <MLSDisclaimer listing={listing} />
        {/* Spacer for bottom buttons */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.ctaButton} onPress={handleContact}>
          <Text style={styles.ctaButtonText}>Check Availability</Text>
        </Pressable>
      </View>
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
  scroll: {
    flex: 1,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.padding.lg,
  },
  errorText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: LAYOUT.radius.sm,
  },
  retryText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    width: 80,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  shareBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },
  bottomBar: {
    padding: LAYOUT.padding.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: LAYOUT.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
  },
});
