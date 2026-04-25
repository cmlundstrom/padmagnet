// Welcome screen — first-launch surface for new users + sign-out fallback.
//
// Layout (top → bottom, all inside a ScrollView for smaller phones):
//   1. WelcomeHero      — rotating photo + floating category cards + dots
//   2. Brand block       — logo + "PadMagnet" wordmark side-by-side
//   3. Headline          — "Stop Searching. / Start Matching." (huge)
//   4. Sub-tagline       — "Powered by PadScore™"
//   5. Primary CTA       — "Start Swiping Rentals" (orange, full pulse glow)
//   6. Secondary CTA     — "List Your Property" (blue, subtler glow)
//   7. Trust line        — "Real listings. Real matches. No spam."
//   8. Sign-in link      — "Already have an account? Sign In"
//   9. FeatureBar        — 3 columns, tappable tooltips
//
// Auth flows (handleRenterRole, handleOwnerRole, handleCategoryPick) all
// follow the existing anon-session-then-redirect pattern. handleCategoryPick
// adds a propertyType query param to the swipe deck route — task #33 wires
// the actual filter on the swipe.js side.
//
// Entry-animation choreography (~1.2s total) staggers Reanimated fade+slide
// for each section — see the per-block useAnimatedStyle blocks below.

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WelcomeHero from '../components/welcome/WelcomeHero';
import FeatureBar from '../components/welcome/FeatureBar';
import { saveUserRole, setRoleSelected } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

export default function WelcomeScreen() {
  const [loadingRenter, setLoadingRenter] = useState(false);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const insets = useSafeAreaInsets();

  // ── Anon-session helpers (unchanged auth wiring) ──────────────────
  const ensureRenterSession = useCallback(async () => {
    await saveUserRole('tenant');
    await setRoleSelected();
    const { data: { session: existing } } = await supabase.auth.getSession();
    if (existing) return true;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Anonymous sign-in failed:', error.message);
      return false;
    }
    if (data?.session) {
      try {
        await supabase.from('profiles')
          .update({ is_anonymous: true, role: 'tenant', roles: ['tenant'] })
          .eq('id', data.session.user.id);
      } catch (err) {
        console.warn('[Welcome] Profile update failed:', err.message);
      }
    }
    return true;
  }, []);

  const handleRenterRole = useCallback(async () => {
    setLoadingRenter(true);
    try {
      const ok = await ensureRenterSession();
      if (!ok) {
        router.replace('/(auth)/email');
        return;
      }
      router.replace('/(tenant)/swipe');
    } catch (err) {
      console.error('handleRenterRole error:', err);
      router.replace('/(auth)/email');
    } finally {
      setLoadingRenter(false);
    }
  }, [ensureRenterSession]);

  // Category card tap — same anon-session as renter, then route to swipe
  // deck WITH a propertyType query param. Filter wiring on the swipe side
  // is task #33; the param sits in the URL ready to consume.
  const handleCategoryPick = useCallback(async (propertyType) => {
    setLoadingRenter(true);
    try {
      const ok = await ensureRenterSession();
      if (!ok) {
        router.replace('/(auth)/email');
        return;
      }
      router.replace({
        pathname: '/(tenant)/swipe',
        params: { propertyType },
      });
    } catch (err) {
      console.error('handleCategoryPick error:', err);
      router.replace('/(auth)/email');
    } finally {
      setLoadingRenter(false);
    }
  }, [ensureRenterSession]);

  const handleOwnerRole = useCallback(async () => {
    setLoadingOwner(true);
    try {
      await saveUserRole('owner');
      await setRoleSelected();
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        router.replace('/(owner)/home');
        return;
      }
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { role: 'owner' } },
      });
      if (error) {
        console.error('Anonymous sign-in failed:', error.message);
        router.replace({ pathname: '/(auth)/email', params: { role: 'owner' } });
        return;
      }
      if (data?.session) {
        try {
          await supabase.from('profiles')
            .update({ is_anonymous: true, role: 'owner', roles: ['owner'] })
            .eq('id', data.session.user.id);
        } catch (err) {
          console.warn('[Welcome] Profile update failed:', err.message);
        }
      }
      router.replace('/(owner)/home');
    } catch (err) {
      console.error('handleOwnerRole error:', err);
      router.replace({ pathname: '/(auth)/email', params: { role: 'owner' } });
    } finally {
      setLoadingOwner(false);
    }
  }, []);

  // ── Entry-animation choreography (~1.2s total) ─────────────────────
  // Each section gets its own shared value driven through withDelay so
  // the whole splash unfurls in a tight, premium sequence. Spec timing:
  //   0.00s  hero (rotator drives its own fade)
  //   0.15s  gradient overlay (built into WelcomeHero, fades with hero)
  //   0.25s  category cards (handled inside WelcomeHero)
  //   0.40s  brand + headline (staggered 80ms)
  //   0.60s  primary CTA + immediate glow
  //   0.75s  secondary CTA
  //   0.90s  trust + sign-in
  //   1.05s  feature bar
  const brandIn = useSharedValue(0);
  const headlineIn = useSharedValue(0);
  const subTaglineIn = useSharedValue(0);
  const primaryIn = useSharedValue(0);
  const secondaryIn = useSharedValue(0);
  const trustIn = useSharedValue(0);
  const featureBarIn = useSharedValue(0);

  // Pulse glow shared values — different amplitudes per CTA hierarchy.
  // Primary pulses stronger; secondary pulses softer.
  const primaryGlow = useSharedValue(0);
  const secondaryGlow = useSharedValue(0);

  useEffect(() => {
    const fadeIn = (v, delay) => {
      v.value = withDelay(delay, withTiming(1, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      }));
    };

    fadeIn(brandIn, 400);
    fadeIn(headlineIn, 480);   // staggered 80ms after brand
    fadeIn(subTaglineIn, 540);
    fadeIn(primaryIn, 600);
    fadeIn(secondaryIn, 750);
    fadeIn(trustIn, 900);
    fadeIn(featureBarIn, 1050);

    // Continuous pulses kick in once the CTAs are visible
    primaryGlow.value = withDelay(600, withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    ));
    secondaryGlow.value = withDelay(800, withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    ));
  }, [brandIn, headlineIn, subTaglineIn, primaryIn, secondaryIn, trustIn, featureBarIn, primaryGlow, secondaryGlow]);

  // Hooks must be called at the top level — one useAnimatedStyle per
  // shared value. The shape is identical across the fade-up sections:
  //   opacity 0→1 + translateY 16→0
  // For sections that need extra (CTA scale, CTA pulse glow), we author
  // those animated-styles individually below.
  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandIn.value,
    transform: [{ translateY: interpolate(brandIn.value, [0, 1], [16, 0]) }],
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineIn.value,
    transform: [{ translateY: interpolate(headlineIn.value, [0, 1], [16, 0]) }],
  }));
  const subTaglineStyle = useAnimatedStyle(() => ({
    opacity: subTaglineIn.value,
    transform: [{ translateY: interpolate(subTaglineIn.value, [0, 1], [16, 0]) }],
  }));
  const trustStyle = useAnimatedStyle(() => ({
    opacity: trustIn.value,
    transform: [{ translateY: interpolate(trustIn.value, [0, 1], [16, 0]) }],
  }));
  const featureBarStyle = useAnimatedStyle(() => ({
    opacity: featureBarIn.value,
    transform: [{ translateY: interpolate(featureBarIn.value, [0, 1], [16, 0]) }],
  }));

  // Primary CTA — combined entry (scale 0.96→1.0 + fade) + continuous pulse
  const primaryAnimStyle = useAnimatedStyle(() => ({
    opacity: primaryIn.value,
    transform: [{ scale: interpolate(primaryIn.value, [0, 1], [0.96, 1.0]) }],
    shadowOpacity: interpolate(primaryGlow.value, [0, 1], [0.25, 0.55]),
    shadowRadius: interpolate(primaryGlow.value, [0, 1], [10, 22]),
  }));
  // Secondary CTA — fade only (no scale per spec) + softer glow
  const secondaryAnimStyle = useAnimatedStyle(() => ({
    opacity: secondaryIn.value,
    transform: [{ translateY: interpolate(secondaryIn.value, [0, 1], [10, 0]) }],
    shadowOpacity: interpolate(secondaryGlow.value, [0, 1], [0.20, 0.35]),
    shadowRadius: interpolate(secondaryGlow.value, [0, 1], [8, 14]),
  }));

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          // Lift FeatureBar above Android nav bar / iOS home indicator.
          // Min 24 so phones reporting 0 inset still get breathing room.
          { paddingBottom: Math.max(insets.bottom + 16, 24) },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1. Hero rotator + category cards + dots */}
        <WelcomeHero onCategoryPick={handleCategoryPick} />

        {/* 2. Brand block — logo + wordmark side-by-side */}
        <Animated.View style={[styles.brandRow, brandStyle]}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.brandLogo}
            contentFit="contain"
          />
          <Text style={styles.brandWordmark}>
            <Text style={styles.brandPad}>Pad</Text>
            <Text style={styles.brandMagnet}>Magnet</Text>
          </Text>
        </Animated.View>

        {/* 3. Two-line headline */}
        <Animated.View style={[styles.headlineWrap, headlineStyle]}>
          <Text style={styles.headlineLine}>
            <Text style={styles.headlineWhite}>Stop Searching.</Text>
          </Text>
          <Text style={styles.headlineLine}>
            <Text style={styles.headlineWhite}>Start </Text>
            <Text style={styles.headlineOrange}>Matching.</Text>
          </Text>
        </Animated.View>

        {/* 4. Sub-tagline */}
        <Animated.Text style={[styles.subTagline, subTaglineStyle]}>
          Powered by <Text style={styles.subTaglineOrange}>PadScore™</Text>
        </Animated.Text>

        {/* 5. Primary CTA — Start Swiping Rentals */}
        <Animated.View style={[styles.ctaPrimaryWrap, primaryAnimStyle]}>
          <Pressable
            style={({ pressed }) => [styles.ctaPrimary, pressed && { opacity: 0.92 }]}
            onPress={handleRenterRole}
            disabled={loadingRenter || loadingOwner}
          >
            <View style={styles.ctaIconCircle}>
              {loadingRenter ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="heart" size={20} color={COLORS.white} />
              )}
            </View>
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>
                {loadingRenter ? 'Loading…' : 'Start Swiping Rentals'}
              </Text>
              <Text style={styles.ctaSubtitle}>
                Swipe, match, and move faster.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </Animated.View>

        {/* 6. Secondary CTA — List Your Property */}
        <Animated.View style={[styles.ctaSecondaryWrap, secondaryAnimStyle]}>
          <Pressable
            style={({ pressed }) => [styles.ctaSecondary, pressed && { opacity: 0.92 }]}
            onPress={handleOwnerRole}
            disabled={loadingRenter || loadingOwner}
          >
            <View style={[styles.ctaIconCircle, styles.ctaIconCircleSecondary]}>
              {loadingOwner ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <Ionicons name="key" size={20} color={COLORS.accent} />
              )}
            </View>
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>
                {loadingOwner ? 'Loading…' : 'List Your Property'}
              </Text>
              <Text style={[styles.ctaSubtitle, { color: COLORS.textSecondary }]}>
                Reach thousands of active renters.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* 7. Trust line */}
        <Animated.View style={[styles.trustRow, trustStyle]}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.logoOrange} />
          <Text style={styles.trustText}>
            Real listings. Real matches.{' '}
            <Text style={styles.trustOrange}>No spam.</Text>
          </Text>
        </Animated.View>

        {/* 8. Sign in link */}
        <Animated.View style={trustStyle}>
          <Pressable
            testID="welcome-signin-link"
            onPress={() => router.replace('/(auth)/email')}
            style={styles.signInRow}
            disabled={loadingRenter || loadingOwner}
          >
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInLink}>Sign In</Text>
            </Text>
          </Pressable>
        </Animated.View>

        {/* 9. Feature bar — 3 tappable columns with stateless tooltips */}
        <Animated.View style={featureBarStyle}>
          <FeatureBar />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  scroll: {
    // paddingBottom is applied dynamically using safe-area insets at runtime
  },

  // ── Brand block ───────────────────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: LAYOUT.padding.lg,
    marginBottom: LAYOUT.padding.sm,
  },
  brandLogo: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.radius.md,
  },
  brandWordmark: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['3xl'],
    lineHeight: FONT_SIZES['3xl'] + 4,
  },
  brandPad: { color: COLORS.white },
  brandMagnet: { color: COLORS.deepOrange },

  // ── Headline ───────────────────────────────────────────────────
  headlineWrap: {
    paddingHorizontal: LAYOUT.padding.lg,
    marginTop: LAYOUT.padding.sm,
    alignItems: 'center',
  },
  headlineLine: {
    textAlign: 'center',
  },
  headlineWhite: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['4xl'],
    lineHeight: FONT_SIZES['4xl'] + 6,
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  headlineOrange: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['4xl'],
    lineHeight: FONT_SIZES['4xl'] + 6,
    color: COLORS.deepOrange,
    letterSpacing: -0.5,
  },

  // ── Sub-tagline ────────────────────────────────────────────────
  subTagline: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: LAYOUT.padding.lg,
  },
  subTaglineOrange: {
    color: COLORS.brandOrange,
    fontFamily: FONTS.body.semiBold,
  },

  // ── CTAs (shared shape) ────────────────────────────────────────
  ctaPrimaryWrap: {
    marginHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
    borderRadius: LAYOUT.radius.lg,
    // Reanimated shadow drives shadowOpacity + shadowRadius via primaryAnimStyle
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.lg,
    paddingVertical: LAYOUT.padding.md,
    paddingHorizontal: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  ctaSecondaryWrap: {
    marginHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
    borderRadius: LAYOUT.radius.lg,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    paddingVertical: LAYOUT.padding.md,
    paddingHorizontal: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },

  ctaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ctaIconCircleSecondary: {
    backgroundColor: COLORS.accent + '22',
  },
  ctaTextWrap: {
    flex: 1,
  },
  ctaTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  ctaSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },

  // ── Trust line ─────────────────────────────────────────────────
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: LAYOUT.padding.sm,
  },
  trustText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  trustOrange: {
    color: COLORS.logoOrange,
    fontFamily: FONTS.body.semiBold,
  },

  // ── Sign-in row ────────────────────────────────────────────────
  signInRow: {
    marginTop: LAYOUT.padding.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  signInText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  signInLink: {
    color: COLORS.accent,
    fontFamily: FONTS.body.semiBold,
  },
});
