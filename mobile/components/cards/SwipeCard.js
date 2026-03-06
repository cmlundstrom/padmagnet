import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { Badge } from '../ui';
import { formatCurrency, formatBedsBaths } from '../../utils/format';
import { MLS_COPYRIGHT } from '../../constants/mls';

const SWIPE_THRESHOLD = LAYOUT.window.width * 0.35;
const ROTATION_ANGLE = 15;

export default function SwipeCard({ listing, onSwipe, onTap, isTop = false }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(isTop ? 1 : 0.95);

  const score = listing.padScore?.score ?? 50;
  const firstPhoto = listing.photos?.[0]?.url;
  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province, listing.postal_code].filter(Boolean).join(', ');

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5;
    })
    .onEnd((event) => {
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        const direction = translateX.value > 0 ? 'right' : 'left';
        const flyTo = translateX.value > 0 ? LAYOUT.window.width * 1.5 : -LAYOUT.window.width * 1.5;
        translateX.value = withTiming(flyTo, { duration: 300 }, () => {
          runOnJS(onSwipe)(direction);
        });
        translateY.value = withTiming(event.translationY * 2, { duration: 300 });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isTop)
    .onEnd(() => {
      if (onTap) runOnJS(onTap)();
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-LAYOUT.window.width, 0, LAYOUT.window.width],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: cardScale.value },
      ],
    };
  });

  const saveOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const skipOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Photo */}
        <View style={styles.imageContainer}>
          {firstPhoto ? (
            <Image
              source={{ uri: firstPhoto }}
              style={styles.image}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              transition={200}
            />
          ) : (
            <View style={styles.placeholderWrap}>
              <Text style={styles.placeholderEmoji}>🌴🏖️</Text>
              <View style={styles.placeholderOverlay}>
                <Text style={styles.placeholderTitle}>Listing Photo</Text>
                <Text style={styles.placeholderTitle}>Coming Soon</Text>
              </View>
            </View>
          )}

          {/* PadScore badge */}
          <View style={styles.scoreBadge}>
            <Badge score={score} />
          </View>

          {/* SAVE overlay */}
          <Animated.View style={[styles.overlay, styles.saveOverlay, saveOverlayStyle]}>
            <Text style={styles.saveText}>SAVE</Text>
          </Animated.View>

          {/* SKIP overlay */}
          <Animated.View style={[styles.overlay, styles.skipOverlay, skipOverlayStyle]}>
            <Text style={styles.skipText}>SKIP</Text>
          </Animated.View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.price}>{formatCurrency(listing.list_price)}<Text style={styles.perMonth}>/mo</Text></Text>
          <Text style={styles.address} numberOfLines={1}>{address}</Text>
          <Text style={styles.city} numberOfLines={1}>{cityLine}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.details}>
              {formatBedsBaths(listing.bedrooms_total, listing.bathrooms_total)}
              {listing.living_area ? ` · ${Number(listing.living_area).toLocaleString()} sqft` : ''}
            </Text>
          </View>
          <Text style={styles.mls} numberOfLines={1}>
            {listing.listing_office_name || MLS_COPYRIGHT.replace('{year}', new Date().getFullYear())}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// Animate the card into position from behind the deck
export function useCardEnterAnimation(index) {
  return {
    scale: interpolate(index, [0, 1, 2], [1, 0.95, 0.9]),
    translateY: interpolate(index, [0, 1, 2], [0, 10, 20]),
  };
}

const styles = StyleSheet.create({
  card: {
    width: LAYOUT.card.width,
    height: LAYOUT.card.height,
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'absolute',
  },
  imageContainer: {
    flex: 0.6,
    backgroundColor: COLORS.surface,
  },
  image: {
    flex: 1,
  },
  placeholderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a5276',
  },
  placeholderEmoji: {
    fontSize: 64,
    opacity: 0.3,
  },
  placeholderOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  placeholderTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 28,
  },
  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  overlay: {
    position: 'absolute',
    top: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 3,
  },
  saveOverlay: {
    left: 20,
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '22',
  },
  skipOverlay: {
    right: 20,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger + '22',
  },
  saveText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.success,
  },
  skipText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.danger,
  },
  info: {
    flex: 0.4,
    padding: LAYOUT.padding.md,
    justifyContent: 'center',
  },
  price: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
  },
  perMonth: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  address: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginTop: 4,
  },
  city: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  details: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  mls: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.slate,
    marginTop: 8,
  },
});
