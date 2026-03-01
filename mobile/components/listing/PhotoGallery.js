import { useRef, useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HEIGHT = SCREEN_WIDTH * 0.75;

export default function PhotoGallery({ photos = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (photos.length === 0) {
    return (
      <View style={[styles.container, styles.noPhotos]}>
        <Text style={styles.noPhotoText}>No Photos Available</Text>
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

      {/* Dot indicators */}
      {photos.length > 1 && photos.length <= 10 && (
        <View style={styles.dots}>
          {photos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
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
  noPhotos: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
