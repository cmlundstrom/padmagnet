import { useState, useEffect } from 'react';
import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '../../components/ui';
import { PhotoGallery, PadScoreBreakdown, ListingInfo } from '../../components/listing';
import { calculatePadScore } from '../../lib/padscore';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

// Preview a listing exactly as tenants see it (used from owner Review step + My Listings)
export default function PreviewScreen() {
  const { listing_id } = useLocalSearchParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listing_id) return;
    (async () => {
      try {
        const data = await apiFetch(`/api/listings/${listing_id}`);
        setListing(data);
      } catch {
        // If the listing is a draft, fetch from owner endpoint
        try {
          const ownerData = await apiFetch(`/api/owner/listings`);
          const match = (ownerData || []).find(l => l.id === listing_id);
          if (match) setListing(match);
        } catch { /* ignore */ }
      } finally {
        setLoading(false);
      }
    })();
  }, [listing_id]);

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

  // Sample PadScore with empty preferences (shows base score)
  const sampleScore = calculatePadScore(null, listing);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Preview as Tenant" showBack />
      <View style={styles.previewBanner}>
        <Text style={styles.previewBannerText}>This is how tenants will see your listing</Text>
      </View>
      <ScrollView style={styles.scroll}>
        {listing.photos?.length > 0 && (
          <PhotoGallery photos={listing.photos} />
        )}
        <PadScoreBreakdown score={sampleScore} />
        <ListingInfo listing={listing} />
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
});
