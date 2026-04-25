// WelcomeHero — top portion of the welcome splash. Combines:
//   - Horizontally-paged hero photo rotator (3 photos: house, apartment, condo)
//   - Code-rendered dark gradient overlay (top→bottom navy fade)
//   - Ken Burns zoom on the active photo (1.0 → 1.05 over 10s, alternate)
//   - CategoryCardRow overlaid at the bottom of the hero (half-floats over photo)
//   - 3 pagination dots reflecting the active scene
//
// Auto-rotate behaviour:
//   - Default: advance every 5s
//   - On user touch (drag): pause auto-rotate
//   - 8s after touch ends: resume auto-rotate
//
// Sync: the same activeIndex drives the hero photo, the highlighted category
// card, and the pagination dots — so the carousel reads as one cohesive scene.
//
// Tap a category card → calls onCategoryPick(propertyType). Parent owns the
// auth/anon-session creation + route to swipe deck.

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  Text,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Hero takes ~42% of screen height — generous on phones, leaves room for
// content + scroll on the smallest target (S10).
const HERO_HEIGHT = Math.round(SCREEN_H * 0.42);

const AUTO_ROTATE_MS = 5000;
const RESUME_AFTER_TOUCH_MS = 8000;
const KEN_BURNS_MS = 10000;

// Three scenes — image + label + filter param + icon. Order is the
// rotator order, also the pagination-dot order.
const SCENES = [
  {
    key: 'house',
    label: 'Houses',
    propertyType: 'House',
    icon: 'home',
    image: require('../../assets/welcome/hero-house.webp'),
  },
  {
    key: 'apartment',
    label: 'Apartments',
    propertyType: 'Apartment',
    icon: 'business',
    image: require('../../assets/welcome/hero-apartment.webp'),
  },
  {
    key: 'condo',
    label: 'Condos',
    propertyType: 'Condo',
    icon: 'business-outline',
    image: require('../../assets/welcome/hero-condo.webp'),
  },
];

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function WelcomeHero({ onCategoryPick }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const autoRotateTimer = useRef(null);
  const resumeTimer = useRef(null);
  const isUserTouching = useRef(false);

  // Ken Burns zoom on the active hero. Single shared value drives all 3
  // images — the gentle scale alternation reads as a slow breathing zoom
  // regardless of which scene is active.
  const kenBurnsScale = useSharedValue(1.0);

  useEffect(() => {
    kenBurnsScale.value = withRepeat(
      withTiming(1.05, { duration: KEN_BURNS_MS, easing: Easing.linear }),
      -1, // infinite
      true, // alternate (1.0 → 1.05 → 1.0)
    );
  }, [kenBurnsScale]);

  const heroAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: kenBurnsScale.value }],
  }));

  // ── Auto-rotate ──────────────────────────────────────────────────────
  const startAutoRotate = useCallback(() => {
    clearInterval(autoRotateTimer.current);
    autoRotateTimer.current = setInterval(() => {
      if (isUserTouching.current) return; // belt-and-suspenders guard
      setActiveIndex(prev => {
        const next = (prev + 1) % SCENES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_ROTATE_MS);
  }, []);

  const pauseAutoRotate = useCallback(() => {
    clearInterval(autoRotateTimer.current);
    autoRotateTimer.current = null;
  }, []);

  const scheduleResume = useCallback(() => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      isUserTouching.current = false;
      startAutoRotate();
    }, RESUME_AFTER_TOUCH_MS);
  }, [startAutoRotate]);

  useEffect(() => {
    startAutoRotate();
    return () => {
      clearInterval(autoRotateTimer.current);
      clearTimeout(resumeTimer.current);
    };
  }, [startAutoRotate]);

  // ── Touch / scroll handlers ─────────────────────────────────────────
  const onScrollBeginDrag = useCallback(() => {
    isUserTouching.current = true;
    pauseAutoRotate();
    clearTimeout(resumeTimer.current);
  }, [pauseAutoRotate]);

  const onMomentumScrollEnd = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== activeIndex) setActiveIndex(idx);
    scheduleResume();
  }, [activeIndex, scheduleResume]);

  // ── Render ──────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => (
    <View style={styles.slide}>
      <AnimatedImage
        source={item.image}
        style={[styles.heroImage, heroAnimStyle]}
        contentFit="cover"
        transition={300}
      />
    </View>
  ), [heroAnimStyle]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SCENES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
      />

      {/* Dark gradient overlay — top→bottom navy fade. Code-rendered so we
          can tune it without re-editing the source images. Runs above the
          hero, below the floating category cards. */}
      <LinearGradient
        colors={['rgba(10,20,40,0.15)', 'rgba(10,20,40,0.80)']}
        locations={[0, 1]}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {/* Category cards — float at the hero's bottom, half-overlay onto
          the photo, half onto the navy below (achieved via parent layout
          padding compensation). */}
      <View style={styles.categoryRow} pointerEvents="box-none">
        {SCENES.map((scene, i) => (
          <CategoryCard
            key={scene.key}
            scene={scene}
            isActive={i === activeIndex}
            onPress={() => onCategoryPick(scene.propertyType)}
          />
        ))}
      </View>

      {/* Pagination dots — sit on the navy below the floating cards. Active
          dot scales 1.2x and goes brand-orange. */}
      <View style={styles.dotsRow}>
        {SCENES.map((_, i) => (
          <Dot key={i} isActive={i === activeIndex} />
        ))}
      </View>
    </View>
  );
}

// ── CategoryCard — small thumbnail + icon + label, pill shape ─────────
function CategoryCard({ scene, isActive, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Image
        source={scene.image}
        style={styles.cardImage}
        contentFit="cover"
      />
      {/* Bottom darken on the thumbnail so the label reads on any photo */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={styles.cardImageScrim}
        pointerEvents="none"
      />
      <View style={styles.cardLabelRow}>
        <Ionicons name={scene.icon} size={13} color={COLORS.white} />
        <Text style={styles.cardLabel} numberOfLines={1}>{scene.label}</Text>
      </View>
    </Pressable>
  );
}

// ── Dot — pagination, active scales + colors ──────────────────────────
function Dot({ isActive }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(isActive ? 1.2 : 1, { damping: 14, stiffness: 180 });
  }, [isActive, scale]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      style={[
        styles.dot,
        isActive && styles.dotActive,
        animStyle,
      ]}
    />
  );
}

const CARD_W = 110;
const CARD_H = 78;
const CARD_GAP = 8;

const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    // Total visual height = hero photo + half-overlap of cards onto navy
    // below + pagination dots zone.
    height: HERO_HEIGHT + CARD_H * 0.5 + 30,
    backgroundColor: COLORS.navy,
  },
  slide: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
  },
  categoryRow: {
    position: 'absolute',
    // Cards sit straddling the hero/navy boundary — top half on photo,
    // bottom half on navy — for the "floating" feel from the mockup.
    top: HERO_HEIGHT - CARD_H * 0.5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: CARD_GAP,
    paddingHorizontal: LAYOUT.padding.md,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    // Subtle baseline shadow so cards read as "floating" on dark navy.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  cardActive: {
    borderColor: COLORS.logoOrange,
    // Stronger glow on the active card.
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardImageScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardLabelRow: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    flexShrink: 1,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: COLORS.logoOrange,
  },
});
