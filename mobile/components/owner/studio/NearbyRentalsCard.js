import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, FlatList, ActivityIndicator,
  StyleSheet, Dimensions, Modal,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '../../../lib/api';
import { formatCurrency } from '../../../utils/format';
import NoPhotoPlaceholder from '../../ui/NoPhotoPlaceholder';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../../../constants/layout';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = SW * 0.85;
const CARD_H = SH * 0.75;
const GRID_GAP = 8;
const THUMB_W = (CARD_W - LAYOUT.padding.md * 2 - GRID_GAP) / 2;
const DISMISS_THRESHOLD = 120;
const RADIUS_OPTIONS = [2, 5, 7, 10];

/**
 * NearbyRentalsCard — manila folder overlay with MLS comp listings.
 *
 * Arrives from 45-degree top-right angle. Shows radius chips, summary,
 * and 2-column grid of comparable listings. Drag or tap outside to dismiss.
 *
 * Props:
 *   visible  — boolean
 *   onClose  — dismiss callback
 *   form     — current studio form state (address, rent, type, beds)
 *   coords   — { latitude, longitude } from address autocomplete (optional)
 */
export default function NearbyRentalsCard({ visible, onClose, form, coords }) {
  const [radius, setRadius] = useState(10);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Animation values
  const translateX = useSharedValue(SW);
  const translateY = useSharedValue(-SH * 0.5);
  const rotate = useSharedValue(45);
  const opacity = useSharedValue(0);
  const swipeY = useSharedValue(0);

  // Entrance animation
  useEffect(() => {
    if (visible) {
      // Start off-screen top-right at 45 degrees
      translateX.value = SW * 0.4;
      translateY.value = -SH * 0.5;
      rotate.value = 45;
      opacity.value = 0;
      swipeY.value = 0;

      // Spring into center
      translateX.value = withSpring(0, { damping: 16, stiffness: 80 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 80 });
      rotate.value = withSpring(0, { damping: 14, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 300 });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [visible]);

  // Fetch comps when visible or radius changes
  useEffect(() => {
    if (!visible) return;
    fetchComps(radius);
  }, [visible, radius]);

  const fetchComps = useCallback(async (r) => {
    // Need either coords or city to search
    if (!coords?.latitude && !form.city) return;

    setLoading(true);
    try {
      let url;
      if (coords?.latitude && coords?.longitude) {
        // Geo search
        url = `/api/owner/nearby-rentals?lat=${coords.latitude}&lng=${coords.longitude}&radius=${r}&limit=20&page=1`;
        if (form.bedrooms_total) url += `&beds=${form.bedrooms_total}`;
      } else {
        // City fallback
        url = `/api/listings?city=${encodeURIComponent(form.city)}&limit=20&page=1`;
      }

      const data = await apiFetch(url);
      let results = data.listings || data || [];

      // Price range filter: +/- $1000 from owner's asking rent
      if (form.list_price) {
        const askingRent = parseFloat(form.list_price);
        const minPrice = askingRent - 1000;
        const maxPrice = askingRent + 1000;
        results = results.filter(l =>
          l.list_price >= minPrice && l.list_price <= maxPrice
        );
      }

      // Property type preference (soft filter — show all if too few similar)
      if (form.property_sub_type && results.length > 4) {
        const similar = results.filter(l => l.property_sub_type === form.property_sub_type);
        if (similar.length >= 3) results = similar;
      }

      setListings(results.slice(0, 20));
      setTotalCount(results.length);
    } catch {
      setListings([]);
      setTotalCount(0);
    }
    setLoading(false);
  }, [coords, form.city, form.list_price, form.bedrooms_total, form.property_sub_type]);

  // Dismiss animation
  const dismiss = useCallback(() => {
    swipeY.value = withTiming(0, { duration: 100 });
    translateY.value = withTiming(SH * 0.6, { duration: 350 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  // Swipe-to-dismiss gesture on handle
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      swipeY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        runOnJS(dismiss)();
      } else {
        swipeY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + swipeY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0, 1], [0, 0.5]),
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent statusBarTranslucent onRequestClose={dismiss}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Backdrop — tap to dismiss */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        {/* Card */}
        <View style={styles.cardContainer} pointerEvents="box-none">
          <Animated.View style={[styles.card, cardStyle]}>
            <LinearGradient
              colors={['#C4AD78', '#DECA92', '#E8D8A4', '#D8C88E', '#BEA66A', '#A08040']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.74, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Internal paper highlight */}
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Manila tab */}
              <View style={styles.tabWrap}>
                <LinearGradient
                  colors={['#A89050', '#C4AD78', '#DECA92', '#E8D8A4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.74, y: 1 }}
                  style={styles.tab}
                >
                  <View style={styles.labelSticker}>
                    <Text style={styles.labelText}>Nearby Rentals</Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Drag handle */}
              <GestureDetector gesture={panGesture}>
                <View style={styles.handleArea}>
                  <View style={styles.handleCapsule} />
                  <Ionicons name="chevron-down" size={12} color="rgba(90,70,30,0.4)" style={{ marginTop: 1 }} />
                </View>
              </GestureDetector>

              {/* Header */}
              <Text style={styles.headerText}>
                These are advertised rentals offering similar features
              </Text>

              {/* Radius chips */}
              <View style={styles.chipSection}>
                <Text style={styles.chipLabel}>Radius</Text>
                <View style={styles.chipRow}>
                  {RADIUS_OPTIONS.map(r => (
                    <Pressable
                      key={r}
                      style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
                      onPress={() => { setRadius(r); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    >
                      <Text style={[styles.radiusChipText, radius === r && styles.radiusChipTextActive]}>
                        {r} mi
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Summary */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryBold}>{totalCount}</Text> listing{totalCount !== 1 ? 's' : ''} within{' '}
                  <Text style={styles.summaryBold}>{radius} mi</Text>
                </Text>
                {form.list_price && (
                  <Text style={styles.priceRange}>
                    ${Math.max(0, parseFloat(form.list_price) - 1000).toLocaleString()} – ${(parseFloat(form.list_price) + 1000).toLocaleString()}/mo
                  </Text>
                )}
              </View>

              {/* Listing grid */}
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color="#5C4A1E" />
                  <Text style={styles.loadingText}>Finding nearby rentals...</Text>
                </View>
              ) : listings.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="search-outline" size={36} color="#8A7040" />
                  <Text style={styles.emptyText}>
                    No MLS data available for this area yet.{'\n'}Try increasing the radius.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={listings}
                  keyExtractor={(item, i) => item.id || String(i)}
                  numColumns={2}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => <CompCard listing={item} />}
                />
              )}

              {/* Disclaimer */}
              <Text style={styles.disclaimer}>
                For comparison only — not a property valuation.
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function CompCard({ listing }) {
  const photo = listing.photos?.[0]?.url;
  const street = [listing.street_number, listing.street_name].filter(Boolean).join(' ');

  return (
    <View style={styles.compCard}>
      <View style={styles.compPhotoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.compPhoto} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.compPhoto, styles.compNoPhoto]}>
            <Ionicons name="home-outline" size={20} color="#8A7040" />
          </View>
        )}
        {listing.distance_miles != null && (
          <View style={styles.compDistBadge}>
            <Text style={styles.compDistText}>{listing.distance_miles.toFixed(1)} mi</Text>
          </View>
        )}
      </View>
      <Text style={styles.compPrice} numberOfLines={1}>
        {formatCurrency(listing.list_price)}<Text style={styles.compPriceMo}>/mo</Text>
      </Text>
      <Text style={styles.compAddress} numberOfLines={1}>{street || listing.city || '—'}</Text>
      <Text style={styles.compDetails} numberOfLines={1}>
        {listing.bedrooms_total || '—'}bd · {listing.bathrooms_total || '—'}ba
        {listing.living_area ? ` · ${Number(listing.living_area).toLocaleString()} sqft` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_W,
    maxHeight: CARD_H,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  cardGradient: {
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    flex: 1,
  },
  // Manila tab
  tabWrap: {
    position: 'absolute',
    top: -30,
    right: 20,
    zIndex: 1,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  labelSticker: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  labelText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.xs,
    color: '#5C4A1E',
    letterSpacing: 0.3,
  },
  // Handle
  handleArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handleCapsule: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(90,70,30,0.3)',
  },
  // Header
  headerText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: '#3D2E0A',
    textAlign: 'center',
    paddingHorizontal: LAYOUT.padding.md,
    marginBottom: 10,
  },
  // Radius chips
  chipSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.md,
    marginBottom: 8,
    gap: 8,
  },
  chipLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: '#5C4A1E',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(90,70,30,0.2)',
  },
  radiusChipActive: {
    backgroundColor: '#5C4A1E',
    borderColor: '#5C4A1E',
  },
  radiusChipText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: '#5C4A1E',
  },
  radiusChipTextActive: {
    color: '#E8D8A4',
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.md,
    marginBottom: 10,
  },
  summaryText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#5C4A1E',
  },
  summaryBold: {
    fontFamily: FONTS.body.bold,
    color: '#3D2E0A',
  },
  priceRange: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#7A5C1E',
  },
  // Loading / empty
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#5C4A1E',
    marginTop: 8,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#5C4A1E',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  // Grid
  gridContent: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: 8,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  // Comp card
  compCard: {
    width: THUMB_W,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
  },
  compPhotoWrap: {
    width: '100%',
    height: THUMB_W * 0.7,
    overflow: 'hidden',
  },
  compPhoto: {
    width: '100%',
    height: '100%',
  },
  compNoPhoto: {
    backgroundColor: 'rgba(200,180,140,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compDistBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  compDistText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 9,
    color: '#fff',
  },
  compPrice: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.sm,
    color: '#3D2E0A',
    paddingHorizontal: 6,
    paddingTop: 5,
  },
  compPriceMo: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#7A5C1E',
  },
  compAddress: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#5C4A1E',
    paddingHorizontal: 6,
    marginTop: 1,
  },
  compDetails: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: '#8A7040',
    paddingHorizontal: 6,
    paddingBottom: 6,
    marginTop: 1,
  },
  // Disclaimer
  disclaimer: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#8A7040',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: LAYOUT.padding.md,
  },
});
