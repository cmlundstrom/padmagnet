import { useRef, useState, useCallback, useEffect } from 'react';
import { View, FlatList, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import NoPhotoPlaceholder from '../ui/NoPhotoPlaceholder';
import TierBadge from '../owner/TierBadge';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HEIGHT = SCREEN_WIDTH * 0.75;

export default function PhotoGallery({ photos = [], tierBadge = null }) {
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
      <View style={styles.container}>
        <NoPhotoPlaceholder size="full" />
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

      {/* Tier badge (top-left) */}
      {tierBadge && tierBadge !== 'free' && (
        <View style={styles.tierBadgeWrap}>
          <TierBadge tier={tierBadge} />
        </View>
      )}

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
          <FontAwesome name="chevron-right" size={14} color={COLORS.overlayWhiteStrong} />
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
  tierBadgeWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 5,
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.scrimDark,
    borderRadius: LAYOUT.radius.md,
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
    backgroundColor: COLORS.overlayWhiteLight,
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.overlayWhiteStrong,
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
    color: COLORS.overlayWhiteStrong,
    textShadowColor: COLORS.scrimDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
