import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, FlatList, ActivityIndicator,
  StyleSheet, Dimensions, BackHandler,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DragHandle from '../../ui/DragHandle';
import ManilaCard from '../../ui/ManilaCard';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '../../../lib/api';
import { formatCurrency, formatBedsBaths } from '../../../utils/format';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../../../constants/layout';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = SW * 0.88;
const CARD_H = SH * 0.75;
const GRID_GAP = 12;
const THUMB_W = (CARD_W - LAYOUT.padding.md * 2 - GRID_GAP) / 2;
const DISMISS_THRESHOLD = 120;
const RADIUS_OPTIONS = [2, 5, 7, 10];
// Bounded height for the listings grid so it scrolls internally when the
// current radius returns more rows than fit in the card. Headers, chips,
// summary and disclaimer consume ~270dp; the rest is the scrollable area.
const LIST_MAX_H = Math.max(280, CARD_H - 270);

/**
 * NearbyRentalsCard — manila folder overlay with MLS comp listings.
 */
export default function NearbyRentalsCard({ visible, onClose, form, coords }) {
  const [radius, setRadius] = useState(10);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const translateX = useSharedValue(SW);
  const translateY = useSharedValue(-SH * 0.5);
  const rotate = useSharedValue(45);
  const opacity = useSharedValue(0);
  const swipeY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = SW * 0.4;
      translateY.value = -SH * 0.5;
      rotate.value = 45;
      opacity.value = 0;
      swipeY.value = 0;
      translateX.value = withSpring(0, { damping: 16, stiffness: 80 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 80 });
      rotate.value = withSpring(0, { damping: 14, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 300 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    fetchComps(radius);
  }, [visible, radius, fetchComps]);

  const fetchComps = useCallback(async (r) => {
    if (!coords?.latitude && !form.city) return;
    setLoading(true);
    try {
      let url;
      if (coords?.latitude && coords?.longitude) {
        url = `/api/owner/nearby-rentals?lat=${coords.latitude}&lng=${coords.longitude}&radius=${r}&limit=40&page=1`;
      } else {
        url = `/api/listings?city=${encodeURIComponent(form.city)}&limit=40&page=1`;
      }
      const data = await apiFetch(url);
      let results = data.listings || data || [];

      if (form.list_price) {
        const askingRent = parseFloat(form.list_price);
        // Try tight range first (+/- $1500), widen to +/- $3000 if sparse, but always filter
        const tight = results.filter(l => l.list_price >= Math.max(0, askingRent - 1500) && l.list_price <= askingRent + 1500);
        if (tight.length >= 3) {
          results = tight;
        } else {
          const wide = results.filter(l => l.list_price >= Math.max(0, askingRent - 3000) && l.list_price <= askingRent + 3000);
          results = wide;
        }
      }
      if (form.property_sub_type && results.length > 6) {
        const similar = results.filter(l => l.property_sub_type === form.property_sub_type);
        if (similar.length >= 4) results = similar;
      }
      setListings(results.slice(0, 20));
      setTotalCount(results.length);
    } catch {
      setListings([]);
      setTotalCount(0);
    }
    setLoading(false);
  }, [coords, form.city, form.list_price, form.bedrooms_total, form.property_sub_type]);

  const dismiss = useCallback(() => {
    swipeY.value = withTiming(0, { duration: 100 });
    translateY.value = withTiming(SH * 0.6, { duration: 350 });
    opacity.value = withTiming(0, { duration: 300 }, () => { runOnJS(onClose)(); });
  }, [onClose]);

  // Only activate pan after a 20dp *downward* drag. Upward drags and short
  // taps pass through to the FlatList so the grid scrolls natively when the
  // radius returns more rows than fit.
  const panGesture = Gesture.Pan()
    .activeOffsetY([-999, 20])
    .failOffsetY([-5, 999])
    .onUpdate((e) => { swipeY.value = Math.max(0, e.translationY); })
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

  // Android back button handler
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => handler.remove();
  }, [visible]);

  if (!visible) return null;

  // Display the widest possible range used by the filter
  const priceMin = form.list_price ? Math.max(0, parseFloat(form.list_price) - 3000) : null;
  const priceMax = form.list_price ? parseFloat(form.list_price) + 3000 : null;

  return (
    <View style={styles.absoluteOverlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>

        <View style={styles.cardContainer} pointerEvents="box-none">
          <Animated.View style={[styles.card, cardStyle]}>
            <GestureDetector gesture={panGesture}>
              <View>
                <ManilaCard label="Nearby Rentals" tabAlign="right" bodyHeight={450}>
                  <Text style={styles.headerText}>
                    These are advertised rentals offering similar features
                  </Text>

              {/* Radius chips — using global CHIP_STYLES */}
              <View style={styles.chipSection}>
                <Text style={styles.chipLabel}>Radius</Text>
                <View style={styles.chipRow}>
                  {RADIUS_OPTIONS.map(r => (
                    <Pressable
                      key={r}
                      style={[CHIP_STYLES.chip, styles.manilaChip, radius === r && styles.manilaChipActive]}
                      onPress={() => { setRadius(r); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    >
                      <Text style={[CHIP_STYLES.chipText, styles.manilaChipText, radius === r && styles.manilaChipTextActive]}>
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
                {priceMin != null && (
                  <Text style={styles.priceRange}>
                    ${priceMin.toLocaleString()} – ${priceMax.toLocaleString()}/mo
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
                  showsVerticalScrollIndicator
                  indicatorStyle="black"
                  style={{ maxHeight: LIST_MAX_H }}
                  renderItem={({ item }) => <CompCard listing={item} />}
                />
              )}

              {/* Disclaimer */}
              <Text style={styles.disclaimer}>
                For comparison only — not a property valuation.
              </Text>
                </ManilaCard>
              </View>
            </GestureDetector>
          </Animated.View>
        </View>
    </View>
  );
}

function CompCard({ listing }) {
  const photo = listing.photos?.[0]?.url;
  const street = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.postal_code].filter(Boolean).join(', ');

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
        {/* Bottom gradient on photo */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.compPhotoFade}
        />
      </View>
      <View style={styles.compInfo}>
        <Text style={styles.compPrice} numberOfLines={1}>
          {formatCurrency(listing.list_price)}<Text style={styles.compPriceMo}>/mo</Text>
        </Text>
        <Text style={styles.compAddress} numberOfLines={1}>{street || '—'}</Text>
        <Text style={styles.compCity} numberOfLines={1}>{cityLine || ' '}</Text>
        <Text style={styles.compDetails} numberOfLines={1}>
          {formatBedsBaths(listing.bedrooms_total, listing.bathrooms_total)}
          {listing.living_area ? ` • ${Number(listing.living_area).toLocaleString()} sqft` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
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
    height: CARD_H,
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
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: -1,
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

  // Standard card handle — two staggered bars + chevron + shaded header
  handleBand: {
    borderTopLeftRadius: LAYOUT.radius.lg,
    borderTopRightRadius: LAYOUT.radius.lg,
    paddingBottom: 8,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
  },
  handleBarWide: {
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(90,70,30,0.4)',
  },
  handleBarNarrow: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(90,70,30,0.25)',
    marginTop: 4,
  },
  headerText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: '#3D2E0A',
    textAlign: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
    marginTop: 8,
  },

  // Radius chips — manila-adapted from CHIP_STYLES
  chipSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.sm,
    marginBottom: 6,
    gap: 6,
  },
  chipLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: '#5C4A1E',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  manilaChip: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderColor: 'rgba(90,70,30,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  manilaChipActive: {
    backgroundColor: '#5C4A1E',
    borderColor: '#5C4A1E',
  },
  manilaChipText: {
    color: '#5C4A1E',
    fontSize: FONT_SIZES.xs,
  },
  manilaChipTextActive: {
    color: '#E8D8A4',
  },

  // Summary
  summaryRow: {
    paddingHorizontal: LAYOUT.padding.md,
    marginBottom: 8,
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
    fontSize: FONT_SIZES.xs,
    color: '#7A5C1E',
    marginTop: 2,
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
    paddingHorizontal: LAYOUT.padding.sm,
    paddingBottom: 8,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // Comp card — styled like Nearby Rentals page cards
  compCard: {
    width: THUMB_W,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(90,70,30,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  compPhotoWrap: {
    width: '100%',
    height: THUMB_W * 0.65,
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
  compPhotoFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  compDistBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  compDistText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 9,
    color: '#fff',
  },
  compInfo: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  compPrice: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: '#3D2E0A',
    letterSpacing: 0.2,
  },
  compPriceMo: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#7A5C1E',
  },
  compAddress: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: '#5C4A1E',
    marginTop: 3,
  },
  compCity: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#7A5C1E',
    marginTop: 1,
  },
  compDetails: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: '#8A7040',
    marginTop: 1,
  },

  // Disclaimer
  disclaimer: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: LAYOUT.padding.md,
  },
});
