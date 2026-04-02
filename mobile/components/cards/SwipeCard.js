import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import GlossyHeart from '../ui/GlossyHeart';
import NoPhotoPlaceholder from '../ui/NoPhotoPlaceholder';
import TierBadge from '../owner/TierBadge';
import { Badge } from '../ui';
import { formatCurrency, formatBedsBaths } from '../../utils/format';
import { MLS_COPYRIGHT } from '../../constants/mls';

const SCREEN_WIDTH = LAYOUT.window.width;
const CARD_WIDTH = LAYOUT.card.width;
const CARD_HEIGHT = LAYOUT.card.height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_VELOCITY = 800;
const ROTATION_ANGLE = 15;

export default function SwipeCard({ listing, onSwipe, onTap, onPreferences, isTop = false, wiggle = false }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Subtle wiggle hint — only on initial load
  useAnimatedReaction(
    function() { return wiggle ? 1 : 0; },
    function(curr) {
      if (curr === 1) {
        translateX.value = withDelay(600,
          withSequence(
            withTiming(8, { duration: 140 }),
            withTiming(-6, { duration: 140 }),
            withTiming(3, { duration: 100 }),
            withTiming(0, { duration: 100 })
          )
        );
      }
    },
    [wiggle]
  );

  const score = listing.padScore?.score ?? 50;
  const firstPhoto = listing.photos?.[0]?.url;
  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const hasPriceDrop = listing.previous_list_price && listing.price_changed_at
    && listing.list_price < listing.previous_list_price
    && (Date.now() - new Date(listing.price_changed_at).getTime()) < 7 * 86400000;
  const cityLine = [listing.city, listing.state_or_province, listing.postal_code].filter(Boolean).join(', ');

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onStart(() => {
      // Reset context — fresh drag each time
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;
    })
    .onEnd((event) => {
      const swipedRight =
        translateX.value > SWIPE_THRESHOLD || event.velocityX > SWIPE_VELOCITY;
      const swipedLeft =
        translateX.value < -SWIPE_THRESHOLD || event.velocityX < -SWIPE_VELOCITY;

      if (swipedRight) {
        translateX.value = withTiming(SCREEN_WIDTH + 200, { duration: 300 }, () => {
          runOnJS(onSwipe)('right');
        });
      } else if (swipedLeft) {
        translateX.value = withTiming(-SCREEN_WIDTH - 200, { duration: 300 }, () => {
          runOnJS(onSwipe)('left');
        });
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isTop)
    .maxDuration(250)
    .onEnd(() => {
      if (onTap) runOnJS(onTap)();
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
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
      <Animated.View style={[styles.gestureTarget, cardStyle]} collapsable={false}>
        <View style={styles.card}>
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
              <NoPhotoPlaceholder size="full" />
            )}

            {/* PadScore row — score + prefs icon inline, tier badge below */}
            <View style={styles.scoreColumn}>
              <View style={styles.scoreRow}>
                <Badge score={score} />
                {onPreferences && (
                  <TouchableOpacity onPress={onPreferences} activeOpacity={0.7} style={styles.prefsIcon}>
                    <Ionicons name="options-outline" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                )}
              </View>
              {listing.owner_tier && listing.owner_tier !== 'free' && (
                <View style={styles.tierBadgeInline}>
                  <TierBadge tier={listing.owner_tier} size="sm" />
                </View>
              )}
            </View>

            {/* Price Drop badge */}
            {hasPriceDrop && (
              <View style={styles.priceDropBadge}>
                <FontAwesome name="arrow-down" size={10} color={COLORS.white} />
                <Text style={styles.priceDropText}>Price Drop</Text>
              </View>
            )}

            {/* SAVE overlay */}
            <Animated.View style={[styles.overlay, styles.saveOverlay, saveOverlayStyle]}>
              <GlossyHeart size={31} />
            </Animated.View>

            {/* SKIP overlay */}
            <Animated.View style={[styles.overlay, styles.skipOverlay, skipOverlayStyle]}>
              <Text style={{ fontSize: FONT_SIZES.sm, textAlign: 'center', lineHeight: 18 }}>🗑</Text>
            </Animated.View>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.price}>{formatCurrency(listing.list_price)}<Text style={styles.perMonth}>/mo</Text></Text>
            <Text style={styles.address} numberOfLines={1}>{address}, {listing.city}</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.details}>
                {formatBedsBaths(listing.bedrooms_total, listing.bathrooms_total)}
                {listing.living_area ? ` · ${Number(listing.living_area).toLocaleString()} sqft` : ''}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Outer gesture target — NO overflow hidden, explicit size, collapsable=false
  gestureTarget: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  // Inner visual card — overflow hidden for rounded corners
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: {
    flex: 0.7,
    backgroundColor: COLORS.surface,
  },
  image: {
    flex: 1,
  },
  scoreColumn: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prefsIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeInline: {
    zIndex: 5,
  },
  priceDropBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: LAYOUT.radius.md,
    gap: 4,
  },
  priceDropText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },
  overlay: {
    position: 'absolute',
    top: '40%',
    width: 48,
    height: 48,
    borderRadius: LAYOUT.radius.xl,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveOverlay: {
    left: 16,
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '33',
  },
  skipOverlay: {
    right: 16,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger + '33',
  },
  info: {
    flex: 0.3,
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
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginTop: 2,
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
    marginTop: 4,
  },
  details: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  mls: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    marginTop: 8,
  },
});
