import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View, Text, Pressable, FlatList, ActivityIndicator,
  ScrollView, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay, withRepeat,
  interpolate, runOnJS, Easing,
} from 'react-native-reanimated';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useNearbyRentals from '../../hooks/useNearbyRentals';
import DragHandle from '../ui/DragHandle';
import MapView from '../map/MapView';
import { formatCurrency } from '../../utils/format';
import { EqualHousingBadge } from '../ui';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;
const GRID_GAP = 10;
const CARD_W = (SCREEN_W - LAYOUT.padding.md * 2 - GRID_GAP) / 2;

// Miami fallback — grid loads immediately while folders are on top
const MIAMI_FALLBACK = { latitude: 25.7617, longitude: -80.1918 };

// Semi-transparent manila body (93% opacity — grid peeks through)
const BODY_COLORS = [
  'rgba(196, 173, 120, 0.93)',
  'rgba(222, 202, 146, 0.93)',
  'rgba(232, 216, 164, 0.93)',
  'rgba(216, 200, 142, 0.93)',
  'rgba(190, 166, 106, 0.93)',
  'rgba(160, 128, 64, 0.93)',
];

// ─── Radar ring for L2 GPS ask ──────────────────────────
function RadarRing({ delay }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false)
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 2.8]) }],
    opacity: interpolate(progress.value, [0, 0.3, 1], [0.5, 0.3, 0]),
  }));
  return <Animated.View style={[styles.radarRing, style]} />;
}

// ─── Shared data layer — keyed by coords so hook remounts on GPS update ────
function NearbyDataLayer({ coords, viewMode, isAnon, ownerHasListings, onShowAuth, onNavigateCreate, onNavigateListings, onNavigateExplore }) {
  const { listings, loading } = useNearbyRentals(
    null, { lat: coords.latitude, lng: coords.longitude, defaultRadius: 10 }
  );

  if (viewMode === 'map') {
    return <MapView listings={listings} loading={loading} initialCoords={coords} />;
  }

  return (
    <BaseGrid
      listings={listings}
      loading={loading}
      isAnon={isAnon}
      ownerHasListings={ownerHasListings}
      onShowAuth={onShowAuth}
      onNavigateCreate={onNavigateCreate}
      onNavigateListings={onNavigateListings}
      onNavigateExplore={onNavigateExplore}
    />
  );
}

// ─── Base grid — receives listings from data layer ────
function BaseGrid({ listings, loading, isAnon, ownerHasListings, onShowAuth, onNavigateCreate, onNavigateListings, onNavigateExplore }) {
  if (loading && listings.length === 0) {
    return (
      <View style={styles.gridLoading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.gridLoadingText}>Finding rentals near you...</Text>
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View style={styles.gridEmpty}>
        <FontAwesome name="map-marker" size={40} color={COLORS.slate} style={{ opacity: 0.3 }} />
        <Text style={styles.gridEmptyText}>No rentals found nearby</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={listings}
      keyExtractor={item => item.id}
      numColumns={2}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContent}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <Text style={styles.gridHeader}>
            There are <Text style={styles.gridCount}>{listings.length}</Text> rentals within a <Text style={styles.gridCount}>10 mi</Text> ring being advertised right now:
          </Text>
          <View style={styles.gridActions}>
            <Pressable style={styles.gridActionBtn} onPress={onNavigateExplore}>
              <MaterialIcons name="assessment" size={16} color={COLORS.white} />
              <Text style={styles.gridActionText}>Market Research</Text>
            </Pressable>
            <Pressable
              style={[styles.gridActionBtn, styles.gridActionPrimary]}
              onPress={() => {
                if (isAnon) return onShowAuth?.();
                if (ownerHasListings) return onNavigateListings?.();
                onNavigateCreate?.();
              }}
            >
              <FontAwesome name={ownerHasListings ? 'list-ul' : 'plus'} size={14} color={COLORS.white} />
              <Text style={styles.gridActionText}>{ownerHasListings ? 'My Listings' : 'Enter My Listing'}</Text>
            </Pressable>
          </View>
        </View>
      }
      ListFooterComponent={<EqualHousingBadge style={{ marginTop: 16 }} />}
      renderItem={({ item }) => {
        const photo = item.photos?.[0]?.url;
        return (
          <View style={styles.gridCard}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.gridPhoto} contentFit="cover" />
            ) : (
              <View style={[styles.gridPhoto, styles.gridNoPhoto]}>
                <Text style={{ fontSize: 24 }}>{'\u{1F3E0}'}</Text>
              </View>
            )}
            <View style={styles.gridCardInfo}>
              <Text style={styles.gridPrice}>
                {item.list_price ? `${formatCurrency(item.list_price)}/mo` : 'Contact'}
              </Text>
              <Text style={styles.gridAddress} numberOfLines={1}>
                {[item.street_number, item.street_name].filter(Boolean).join(' ')}
              </Text>
              {item.city && <Text style={styles.gridCity} numberOfLines={1}>{item.city}</Text>}
              <Text style={styles.gridMeta}>
                {item.bedrooms_total || '\u2014'}bd {'\u00b7'} {item.bathrooms_total || '\u2014'}ba
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

// ─── Manila folder with slide-to-corner dismiss ─────────
const ManilaFolder = forwardRef(function ManilaFolder(
  { tabLabel, tabAlign, zIndex, angle, dismissCorner, enterOffset, dropShadow, offsetTop, onTabPress, onDismissComplete, children },
  ref
) {
  // Animated properties
  const tX = useSharedValue(0);
  const tY = useSharedValue(SCREEN_H * (enterOffset || 0.6)); // entrance from below
  const scaleV = useSharedValue(1);
  const opacityV = useSharedValue(1);
  const rotateV = useSharedValue(angle);
  const swipeOffset = useSharedValue(0);

  // Spring entrance
  useEffect(() => {
    tY.value = withSpring(0, { damping: 16, stiffness: 90 });
  }, []);

  // Slide-to-corner + shrink + fade dismiss
  const dismiss = useCallback(() => {
    const isLeft = dismissCorner === 'left';
    swipeOffset.value = withTiming(0, { duration: 150 });
    tX.value = withTiming(
      isLeft ? -SCREEN_W * 0.4 : SCREEN_W * 0.4,
      { duration: 600, easing: Easing.inOut(Easing.cubic) }
    );
    tY.value = withTiming(
      SCREEN_H * 0.55,
      { duration: 600, easing: Easing.inOut(Easing.cubic) }
    );
    scaleV.value = withTiming(0.12, { duration: 600, easing: Easing.inOut(Easing.cubic) });
    rotateV.value = withTiming(
      angle + (isLeft ? -18 : 18),
      { duration: 600 }
    );
    opacityV.value = withTiming(0, { duration: 500 }, () => {
      runOnJS(onDismissComplete)();
    });
  }, [dismissCorner, angle, onDismissComplete]);

  // Expose dismiss() to parent via ref
  useImperativeHandle(ref, () => ({ dismiss }), [dismiss]);

  // Swipe-to-dismiss on tab
  const panGesture = Gesture.Pan()
    .onUpdate((e) => { swipeOffset.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        runOnJS(dismiss)();
      } else {
        swipeOffset.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  // Tap on tab — navigate between folders
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onTabPress) runOnJS(onTabPress)();
    });

  // Pan wins if finger moves; tap fires on simple press
  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tX.value },
      { translateY: tY.value + swipeOffset.value },
      { rotate: `${rotateV.value}deg` },
      { scale: scaleV.value },
    ],
    opacity: opacityV.value,
  }));

  const isRight = tabAlign === 'right';

  return (
    <Animated.View pointerEvents="box-none" style={[
      styles.folderOuter,
      { zIndex },
      offsetTop != null && { top: 113 + offsetTop },
      animStyle,
    ]}>
      {/* Tab — tap to switch, swipe to dismiss */}
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.tabWrapper, isRight ? styles.tabRight : styles.tabLeft]}>
          <LinearGradient
            colors={['#A89050', '#C4AD78', '#DECA92', '#E8D8A4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.74, y: 1 }}
            style={styles.tab}
          >
            <View style={styles.labelSticker}>
              <Text style={styles.labelText}>{tabLabel}</Text>
            </View>
            <DragHandle />
          </LinearGradient>
        </View>
      </GestureDetector>

      {/* Semi-transparent manila body — grid visible behind */}
      <LinearGradient
        colors={BODY_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.74, y: 1 }}
        style={[styles.folderBody, dropShadow && styles.folderBodyShadow]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          contentContainerStyle={styles.folderScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </LinearGradient>
    </Animated.View>
  );
});

// ─── Main stack component ───────────────────────────────
const STORAGE_KEY_L1 = 'owner_folder_l1_seen';
const STORAGE_KEY_L2 = 'owner_folder_l2_seen';

export default function ManilaFolderStack({ isAnon, ownerHasListings, viewMode, onShowAuth, onNavigateCreate, onNavigateListings, onNavigateExplore, refreshKey }) {
  const l1Ref = useRef();
  const l2Ref = useRef();
  const [showL1, setShowL1] = useState(false);
  const [showL2, setShowL2] = useState(false);
  const [coords, setCoords] = useState(MIAMI_FALLBACK);
  const [ready, setReady] = useState(false);

  // Check persisted state + location permission on mount
  // GPS is non-blocking — grid renders immediately with Miami fallback
  useEffect(() => {
    (async () => {
      try {
        const [l1Seen, l2Seen, cachedCoords] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_L1),
          AsyncStorage.getItem(STORAGE_KEY_L2),
          AsyncStorage.getItem('owner_cached_coords'),
        ]);

        // Show folders only if not previously dismissed
        if (!l1Seen) setShowL1(true);

        // Use cached coords immediately (no GPS wait)
        if (cachedCoords) {
          try {
            const parsed = JSON.parse(cachedCoords);
            if (parsed.latitude && parsed.longitude) setCoords(parsed);
          } catch {}
        }

        if (!l2Seen) {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            await AsyncStorage.setItem(STORAGE_KEY_L2, '1');
          } else {
            setShowL2(true);
          }
        }
      } catch {}
      // Render immediately — don't wait for GPS
      setReady(true);
    })();

    // Background GPS update — non-blocking, updates grid when ready
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          const newCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCoords(newCoords);
          AsyncStorage.setItem('owner_cached_coords', JSON.stringify(newCoords));
        }
      } catch {}
    })();
  }, []);

  // L2: request location then slide-away
  const handleEnableLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    l2Ref.current?.dismiss();
  }, []);

  // L1: auth-gated create listing
  const handleCreateListing = useCallback(() => {
    if (isAnon) onShowAuth?.();
    else onNavigateCreate?.();
  }, [isAnon, onShowAuth, onNavigateCreate]);

  // L1: "Browse Nearby Rentals" — dismiss L1 to expose L2
  const handleBrowseNearby = useCallback(() => {
    l1Ref.current?.dismiss();
  }, []);

  // Key forces remount of shared data layer when coords or refreshKey change
  const dataKey = `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)},${refreshKey || 0}`;

  return (
    <View style={styles.container}>
      {/* Keyed wrapper — remounts when coords change so hook re-fetches */}
      <NearbyDataLayer
        key={dataKey}
        coords={coords}
        viewMode={viewMode}
        isAnon={isAnon}
        ownerHasListings={ownerHasListings}
        onShowAuth={onShowAuth}
        onNavigateCreate={onNavigateCreate}
        onNavigateListings={onNavigateListings}
        onNavigateExplore={onNavigateExplore}
      />

      {/* ── L2: GPS soft-ask (behind L1, angled +1.5deg) ─ */}
      {showL2 && ready && (
        <ManilaFolder
          ref={l2Ref}
          tabLabel="Your GPS"
          tabAlign="left"
          zIndex={10}
          angle={-2}
          dismissCorner="right"
          onTabPress={showL1 ? handleBrowseNearby : undefined}
          onDismissComplete={() => { setShowL2(false); AsyncStorage.setItem(STORAGE_KEY_L2, '1'); }}
        >
          {/* Radar animation */}
          <View style={styles.radarContainer}>
            <RadarRing delay={0} />
            <RadarRing delay={800} />
            <RadarRing delay={1600} />
            <LinearGradient colors={[COLORS.accent, '#2563EB']} style={styles.radarIcon}>
              <FontAwesome name="map-marker" size={28} color={COLORS.white} />
            </LinearGradient>
          </View>

          <Text style={styles.l2Heading}>
            See what's listed{'\n'}
            <Text style={styles.l2Highlight}>in your neighborhood</Text>
          </Text>

          <Text style={styles.l2Explain}>
            We use your location to show nearby rental listings and local market rates.
            Your exact location is never shared with anyone.
          </Text>

          <View style={styles.l2Benefits}>
            {[
              { icon: 'crosshairs', text: 'Nearby rentals and their asking prices' },
              { icon: 'line-chart', text: 'Compare features and rates at a glance' },
              { icon: 'shield', text: 'Your location stays private \u2014 always' },
            ].map((b, i) => (
              <View key={i} style={styles.l2BenefitRow}>
                <View style={styles.l2BenefitIcon}>
                  <FontAwesome name={b.icon} size={13} color={COLORS.accent} />
                </View>
                <Text style={styles.l2BenefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Enable Location CTA */}
          <Pressable style={styles.enableBtn} onPress={handleEnableLocation}>
            <LinearGradient
              colors={['#F97316', COLORS.logoOrange, '#DC5A2C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.enableGradient}
            >
              <FontAwesome name="location-arrow" size={17} color={COLORS.white} />
              <Text style={styles.enableText}>Enable Location</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => l2Ref.current?.dismiss()} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </ManilaFolder>
      )}

      {/* ── L1: Sales pitch (front folder, angled -2deg) ─ */}
      {showL1 && (
        <ManilaFolder
          ref={l1Ref}
          tabLabel="List For Free"
          tabAlign="right"
          zIndex={20}
          angle={1}
          enterOffset={0.3}
          offsetTop={-10}
          dropShadow
          dismissCorner="left"
          onTabPress={handleBrowseNearby}
          onDismissComplete={() => { setShowL1(false); AsyncStorage.setItem(STORAGE_KEY_L1, '1'); }}
        >
          <Image
            source={require('../../assets/images/padmagnet-icon-512-dark.png')}
            style={styles.l1Icon}
            contentFit="contain"
          />
          <Text style={styles.l1Heading}>{'List Your Rental\nfor Free'}</Text>
          <Text style={styles.l1Subtitle}>
            PadMagnet matches your listing with qualified South Florida renters using smart scoring.
          </Text>

          {/* Feature bullets */}
          <View style={styles.l1Bullets}>
            {[
              'Free to list \u2014 no broker fees, no catch',
              'Average 11K+/- active listings across 5 counties',
              'Smart matching sends your listing to the right renters',
              'One-click competitive pricing research',
            ].map((text, i) => (
              <View key={i} style={styles.l1BulletRow}>
                <Ionicons name="checkmark-circle" size={18} color="#2D6B30" />
                <Text style={styles.l1BulletText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Competitor pricing card */}
          <View style={styles.compCard}>
            <Text style={styles.compTitle}>What others charge</Text>
            {[
              { name: 'Zillow Premium', price: '$39.99' },
              { name: 'Apartments.com', price: '$349' },
              { name: 'Avail Plus', price: '$9/unit' },
            ].map((row, i) => (
              <View key={i} style={styles.compRow}>
                <Text style={styles.compName}>{row.name}</Text>
                <Text style={styles.compPrice}>{row.price}</Text>
              </View>
            ))}
            <View style={[styles.compRow, styles.compHighlight]}>
              <Text style={[styles.compName, { color: '#2D6B30', fontFamily: FONTS.body.bold }]}>PadMagnet</Text>
              <Text style={[styles.compPrice, { color: '#2D6B30', fontFamily: FONTS.heading.bold }]}>FREE</Text>
            </View>
          </View>

          {/* Primary CTA */}
          <Pressable style={styles.l1Cta} onPress={handleCreateListing}>
            <Text style={styles.l1CtaText}>Create Your First Listing</Text>
          </Pressable>

          {/* Secondary CTA — dismiss L1 to expose L2 GPS ask */}
          <Pressable style={styles.l1BrowseBtn} onPress={handleBrowseNearby}>
            <FontAwesome name="map-marker" size={14} color="#E8D8A4" />
            <Text style={styles.l1BrowseText}>Browse Nearby Rentals</Text>
          </Pressable>

          <EqualHousingBadge style={{ marginTop: 12 }} />
        </ManilaFolder>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Folder outer ──────────────────────────────────
  folderOuter: {
    position: 'absolute',
    left: 22,
    right: 12,
    bottom: -20,
    top: 113,
    elevation: 10,
  },

  // ── Tab ───────────────────────────────────────────
  tabWrapper: {
    marginBottom: -1,
    zIndex: 1,
  },
  tabRight: {
    alignSelf: 'flex-end',
    marginRight: 16,
  },
  tabLeft: {
    alignSelf: 'flex-start',
    marginLeft: 16,
  },
  tab: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  labelSticker: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  labelText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: '#3A2810',
    letterSpacing: 0.5,
  },
  dragHandle: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6B5020',
    opacity: 0.5,
  },

  // ── Folder body ───────────────────────────────────
  folderBody: {
    flex: 1,
    borderTopLeftRadius: LAYOUT.radius.xl,
    borderTopRightRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
  },
  folderBodyShadow: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 18,
  },
  folderScroll: {
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding['2xl'] + 40,
  },

  // ── L1: Sales pitch ──────────────────────────────
  l1Icon: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  l1Heading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: '#3A2810',
    textAlign: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  l1Subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#4A3520',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: LAYOUT.padding.lg,
  },
  l1Bullets: {
    marginBottom: LAYOUT.padding.lg,
  },
  l1BulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  l1BulletText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: '#3A2810',
    flex: 1,
  },

  // ── Competitor card ───────────────────────────────
  compCard: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: '#A08040',
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.lg,
  },
  compTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.xs,
    color: '#6B5020',
    marginBottom: LAYOUT.padding.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#A08040',
  },
  compHighlight: {
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  compName: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: '#3A2810',
  },
  compPrice: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: '#3A2810',
  },

  // ── L1 CTAs ───────────────────────────────────────
  l1Cta: {
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  l1CtaText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  l1BrowseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3A2810',
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 12,
    marginBottom: LAYOUT.padding.sm,
  },
  l1BrowseText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: '#E8D8A4',
  },

  // ── L2: GPS ask ───────────────────────────────────
  radarContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: LAYOUT.padding.lg,
  },
  radarRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: LAYOUT.radius.full,
    borderWidth: 2,
    borderColor: COLORS.accent + '55',
  },
  radarIcon: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  l2Heading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: '#3A2810',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: LAYOUT.padding.md,
  },
  l2Highlight: {
    color: '#2A5DB0',
  },
  l2Explain: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: '#4A3520',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: LAYOUT.padding.lg,
  },
  l2Benefits: {
    gap: 14,
    marginBottom: LAYOUT.padding.lg,
  },
  l2BenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  l2BenefitIcon: {
    width: 30,
    height: 30,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.accent + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  l2BenefitText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: '#4A3520',
    flex: 1,
  },
  enableBtn: {
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    marginBottom: LAYOUT.padding.sm,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  enableGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  enableText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.md,
  },
  skipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: '#6B5020',
  },

  // ── Base grid ─────────────────────────────────────
  gridContent: {
    padding: LAYOUT.padding.md,
    paddingBottom: 23,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  gridHeader: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.padding.md,
    lineHeight: 20,
  },
  gridCount: {
    fontFamily: FONTS.heading.bold,
    color: COLORS.brandOrange,
  },
  gridActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: LAYOUT.padding.md,
  },
  gridActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 11,
  },
  gridActionPrimary: {
    backgroundColor: COLORS.logoOrange,
  },
  gridActionText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },
  gridCard: {
    width: CARD_W,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridPhoto: {
    width: '100%',
    height: CARD_W * 0.75,
  },
  gridNoPhoto: {
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardInfo: {
    padding: LAYOUT.padding.sm,
  },
  gridPrice: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  gridAddress: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  gridCity: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    marginTop: 1,
  },
  gridMeta: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    marginTop: 2,
  },
  gridLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  gridLoadingText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  gridEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  gridEmptyText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    textAlign: 'center',
    lineHeight: 20,
  },
});
