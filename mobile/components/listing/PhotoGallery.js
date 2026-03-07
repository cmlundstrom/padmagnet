import { useRef, useState, useCallback, useEffect } from 'react';
import { View, FlatList, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HEIGHT = SCREEN_WIDTH * 0.75;

export default function PhotoGallery({ photos = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const hintTranslateX = useRef(new Animated.Value(0)).current;

  // Drift hint to the right over 4s, then fade out
  useEffect(() => {
    if (photos.length > 1) {
      Animated.timing(hintTranslateX, { toValue: SCREEN_WIDTH * 0.3, duration: 4000, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(hintOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [photos.length, hintOpacity, hintTranslateX]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (photos.length === 0) {
    return (
      <View style={[styles.container, styles.placeholderWrap]}>
        <Text style={styles.placeholderEmoji}>🌴🏖️</Text>
        <View style={styles.placeholderOverlay}>
          <Text style={styles.placeholderTitle}>Listing Photo</Text>
          <Text style={styles.placeholderTitle}>Coming Soon</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(item, index) => item.url || String(index)}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url }}
            style={styles.image}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
        )}
      />

      {/* Photo counter */}
      {photos.length > 1 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {activeIndex + 1} / {photos.length}
          </Text>
        </View>
      )}

      {/* Swipe hint — visible only on first photo, fades out */}
      {photos.length > 1 && activeIndex === 0 && (
        <Animated.View style={[styles.swipeHint, { opacity: hintOpacity, transform: [{ translateX: hintTranslateX }] }]}>
          <Text style={styles.swipeHintText}>Slide for photos</Text>
          <FontAwesome name="chevron-right" size={14} color="rgba(255,255,255,0.85)" />
        </Animated.View>
      )}

      {/* Progress bar */}
      {photos.length > 1 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((activeIndex + 1) / photos.length) * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    backgroundColor: COLORS.surface,
  },
  image: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
  },
  placeholderWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a5276',
  },
  placeholderEmoji: {
    fontSize: 80,
    opacity: 0.25,
  },
  placeholderOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  placeholderTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 34,
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 1.5,
  },
  swipeHint: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  swipeHintText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
