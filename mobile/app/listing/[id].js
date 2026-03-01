import { useState, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Header } from '../../components/ui';
import { PhotoGallery, PadScoreBreakdown, ListingInfo, MLSDisclaimer } from '../../components/listing';
import useSwipe from '../../hooks/useSwipe';
import usePreferences from '../../hooks/usePreferences';
import { calculatePadScore } from '../../lib/padscore';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { recordSwipe } = useSwipe();
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

  const handleSave = async () => {
    if (!listing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await recordSwipe(listing.id, 'right', padScore?.score ?? 50);
    router.back();
  };

  const handleSkip = async () => {
    if (!listing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await recordSwipe(listing.id, 'left', padScore?.score ?? 50);
    router.back();
  };

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
      Alert.alert('Error', err.message);
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
      <Header title="Details" showBack />

      <ScrollView style={styles.scroll} bounces={false}>
        <PhotoGallery photos={listing.photos || []} />
        <PadScoreBreakdown padScore={padScore} />
        <ListingInfo listing={listing} />
        <MLSDisclaimer listing={listing} />
        {/* Spacer for bottom buttons */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky bottom actions */}
      <View style={styles.bottomBar}>
        <Pressable style={[styles.bottomButton, styles.skipBtn]} onPress={handleSkip}>
          <Text style={[styles.bottomButtonText, { color: COLORS.danger }]}>Skip</Text>
        </Pressable>
        <Pressable style={[styles.bottomButton, styles.contactBtn]} onPress={handleContact}>
          <Text style={[styles.bottomButtonText, { color: COLORS.white }]}>Contact</Text>
        </Pressable>
        <Pressable style={[styles.bottomButton, styles.saveBtn]} onPress={handleSave}>
          <Text style={[styles.bottomButtonText, { color: COLORS.white }]}>Save</Text>
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
  bottomBar: {
    flexDirection: 'row',
    padding: LAYOUT.padding.md,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  bottomButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  contactBtn: {
    backgroundColor: COLORS.accent,
  },
  saveBtn: {
    backgroundColor: COLORS.success,
  },
  bottomButtonText: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
  },
});
