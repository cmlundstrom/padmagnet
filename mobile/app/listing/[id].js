import { useState, useEffect, useCallback, useRef } from 'react';
import useAndroidBack from '../../hooks/useAndroidBack';
import { ScrollView, View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming, withDelay, withRepeat, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Header, GlossyHeart } from '../../components/ui';
import { PhotoGallery, PadScoreBreakdown, ListingInfo, MLSDisclaimer } from '../../components/listing';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import ChannelPrompt from '../../components/messaging/ChannelPrompt';
import usePreferences from '../../hooks/usePreferences';
import useSwipe from '../../hooks/useSwipe';
import usePadPoints from '../../hooks/usePadPoints';
import { useAuth } from '../../hooks/useAuth';
import { calculatePadScore } from '../../lib/padscore';
import { supabase } from '../../lib/supabase';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../lib/api';
import { shareListing } from '../../lib/share-listing';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ListingDetailScreen() {
  useAndroidBack();
  const { id, context } = useLocalSearchParams();
  const alert = useAlert();
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { preferences } = usePreferences();
  const { recordSwipe, undoSwipe } = useSwipe();
  const [isSaved, setIsSaved] = useState(context === 'saved');
  const savingRef = useRef(false);
  const heartScale = useSharedValue(1);

  // Burst particles — 3 mini hearts fly outward on save
  const burst0 = useSharedValue(0);
  const burst1 = useSharedValue(0);
  const burst2 = useSharedValue(0);

  // Check if listing is already saved
  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/swipes?listing_id=${id}`)
      .then(data => {
        if (data?.direction === 'right') setIsSaved(true);
      })
      .catch(() => {});
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!listing || savingRef.current) return;
    savingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isSaved) {
      // Unsave — shrink animation
      heartScale.value = withSequence(
        withSpring(0.6, { damping: 8 }),
        withSpring(1, { damping: 12 }),
      );
      const ok = await undoSwipe(listing.id);
      if (ok) setIsSaved(false);
    } else {
      // Save — pulse animation + burst particles
      heartScale.value = withSequence(
        withSpring(1.4, { damping: 6 }),
        withSpring(0.9, { damping: 8 }),
        withSpring(1, { damping: 12 }),
      );
      // Fire 3 mini hearts outward
      burst0.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 600 }));
      burst1.value = withSequence(withTiming(0, { duration: 0 }), withDelay(50, withTiming(1, { duration: 650 })));
      burst2.value = withSequence(withTiming(0, { duration: 0 }), withDelay(100, withTiming(1, { duration: 700 })));

      const score = padScore?.score ?? 50;
      const ok = await recordSwipe(listing.id, 'right', score);
      if (ok) setIsSaved(true);
    }
    savingRef.current = false;
  }, [listing, isSaved, padScore, recordSwipe, undoSwipe, heartScale]);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Each particle: flies in a direction, scales up then fades out
  const makeBurstStyle = (burstVal, tx, ty) => useAnimatedStyle(() => ({
    position: 'absolute',
    opacity: burstVal.value < 0.01 ? 0 : 1 - burstVal.value,
    transform: [
      { translateX: burstVal.value * tx },
      { translateY: burstVal.value * ty },
      { scale: 0.5 + burstVal.value * 0.5 },
    ],
  }));
  const burst0Style = makeBurstStyle(burst0, -30, -40);  // up-left
  const burst1Style = makeBurstStyle(burst1, 0, -50);     // straight up
  const burst2Style = makeBurstStyle(burst2, 30, -35);    // up-right

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

  const handleShare = useCallback(() => shareListing(listing), [listing]);

  const [showAuth, setShowAuth] = useState(false);
  const padPoints = usePadPoints();
  const { session: authSession, isAnon } = useAuth();

  const [showChannelPrompt, setShowChannelPrompt] = useState(false);

  const sendFirstMessage = async () => {
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

  const handleContact = async () => {
    if (!listing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isAnon) {
      setShowAuth(true);
      return;
    }

    // Show channel preference prompt if not yet shown
    const prompted = await ChannelPrompt.hasBeenShown();
    if (!prompted) {
      setShowChannelPrompt(true);
      return;
    }

    sendFirstMessage();
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
            <FontAwesome name="share-alt" size={14} color={COLORS.background} />
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        }
      />

      <ScrollView style={styles.scroll} bounces={false}>
        <PhotoGallery photos={listing.photos || []} tierBadge={listing.owner_tier} />
        {context !== 'owner_browse' && <PadScoreBreakdown padScore={padScore} />}
        <ListingInfo listing={listing} />
        <MLSDisclaimer listing={listing} />
        {/* Spacer for bottom buttons */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating save heart — positioned at price row level */}
      {context !== 'owner_browse' && (
        <Pressable onPress={handleSave} style={styles.heartFab}>
          <Animated.View style={burst0Style}>
            <FontAwesome name="heart" size={10} color={COLORS.success} />
          </Animated.View>
          <Animated.View style={burst1Style}>
            <FontAwesome name="heart" size={12} color={COLORS.successLight} />
          </Animated.View>
          <Animated.View style={burst2Style}>
            <FontAwesome name="heart" size={10} color={COLORS.success} />
          </Animated.View>
          <Animated.View style={heartAnimatedStyle}>
            {isSaved ? (
              <GlossyHeart size={28} />
            ) : (
              <FontAwesome name="heart-o" size={24} color={COLORS.white} />
            )}
          </Animated.View>
        </Pressable>
      )}

      {/* Sticky bottom CTA */}
      <View style={styles.bottomBar}>
        <Pressable testID="listing-detail-contact-owner" onPress={handleContact} style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
          <LinearGradient
            colors={[COLORS.logoOrange, '#D14E2F', '#B8432A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.white} />
            <Text style={styles.ctaButtonText}>
              {context === 'owner_browse' ? 'Contact Listing Agent' : 'Ask About This Rental'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>


      {/* Auth gate for anonymous users */}
      <AuthBottomSheet
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        context="message"
        padpoints={padPoints.padpoints}
      />

      {/* First-time channel preference prompt */}
      <Modal
        visible={showChannelPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChannelPrompt(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}
          onPress={() => setShowChannelPrompt(false)}
        >
          <Pressable onPress={() => {}}>
            <ChannelPrompt onDismiss={() => {
              setShowChannelPrompt(false);
              sendFirstMessage();
            }} />
          </Pressable>
        </Pressable>
      </Modal>
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
    height: 36,
    paddingHorizontal: 14,
    backgroundColor: COLORS.brandOrange,
    borderRadius: 18,
  },
  shareBtnText: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
  },
  heartFab: {
    position: 'absolute',
    top: '67%',
    right: 16,
    width: 52,
    height: 52,
    borderRadius: LAYOUT.radius['2xl'],
    backgroundColor: COLORS.successOverlay,
    borderWidth: 1.5,
    borderColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    overflow: 'visible',
  },
  bottomBar: {
    padding: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.md + 50,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: LAYOUT.radius.lg,
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
