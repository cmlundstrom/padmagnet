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
import Svg, { Path, Line, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
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

// SVG folder constants (match ManilaCard 3.0)
const TAB_H = 37;
const BODY_R = 14;
const TAB_R = 8;
const TAB_W = 160;

/**
 * Build SVG path for manila folder — same algorithm as ManilaCard.
 * One continuous shape: tab notch grows out of the top edge.
 */
function buildFolderPath(width, bodyHeight, tabWidth, tabAlign) {
  const totalHeight = TAB_H + bodyHeight;
  const r = BODY_R;
  const tr = TAB_R;

  let tabLeft, tabRight;
  if (tabAlign === 'left') {
    tabLeft = r;
    tabRight = tabLeft + tabWidth;
  } else if (tabAlign === 'center') {
    tabLeft = (width - tabWidth) / 2;
    tabRight = tabLeft + tabWidth;
  } else {
    tabRight = width - r - 20;
    tabLeft = tabRight - tabWidth;
  }

  return `
    M ${r} ${TAB_H}
    L ${tabLeft - tr} ${TAB_H}
    Q ${tabLeft} ${TAB_H} ${tabLeft} ${TAB_H - tr}
    L ${tabLeft} ${tr}
    Q ${tabLeft} 0 ${tabLeft + tr} 0
    L ${tabRight - tr} 0
    Q ${tabRight} 0 ${tabRight} ${tr}
    L ${tabRight} ${TAB_H - tr}
    Q ${tabRight} ${TAB_H} ${tabRight + tr} ${TAB_H}
    L ${width - r} ${TAB_H}
    Q ${width} ${TAB_H} ${width} ${TAB_H + r}
    L ${width} ${totalHeight - r}
    Q ${width} ${totalHeight} ${width - r} ${totalHeight}
    L ${r} ${totalHeight}
    Q 0 ${totalHeight} 0 ${totalHeight - r}
    L 0 ${TAB_H + r}
    Q 0 ${TAB_H} ${r} ${TAB_H}
    Z
  `;
}

// ─── Radar ring for L2 GPS ask ──────────────────────────
function RadarRing({ delay, size = 56, color, duration = 2400 }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.ease) }), -1, false)
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderColor: color || COLORS.accent + '55',
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 3.2]) }],
    opacity: interpolate(progress.value, [0, 0.2, 1], [0.6, 0.35, 0]),
  }));
  return <Animated.View style={[styles.radarRing, style]} />;
}

// ─── Pulsing glow behind radar icon ────────────────────
function PulseGlow() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.35]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.15]),
  }));
  return <Animated.View style={styles.pulseGlow} />;
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
            {/* Market Research — blue gradient */}
            <Pressable style={styles.gridActionBtn} onPress={onNavigateExplore}>
              <LinearGradient
                colors={['#4A9EF5', '#3B82F6', COLORS.accent, '#1D4ED8', '#1A3FAA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gridActionGradient}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.06)', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.gridActionShine}
                />
                <View style={styles.gridActionContent}>
                  <View style={styles.gridActionIconWrap}>
                    <MaterialIcons name="assessment" size={12} color={COLORS.white} />
                  </View>
                  <Text style={styles.gridActionText}>Market Research</Text>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.15)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.gridActionBottomEdge}
                />
              </LinearGradient>
            </Pressable>
            {/* Enter My Listing — orange gradient */}
            <Pressable
              style={[styles.gridActionBtn, styles.gridActionPrimary]}
              onPress={() => {
                if (isAnon) return onShowAuth?.();
                if (ownerHasListings) return onNavigateListings?.();
                onNavigateCreate?.();
              }}
            >
              <LinearGradient
                colors={['#FF8C38', '#F97316', COLORS.logoOrange, '#DC5A2C', '#B84A1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gridActionGradient}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.06)', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.gridActionShine}
                />
                <View style={styles.gridActionContent}>
                  <View style={styles.gridActionIconWrap}>
                    <FontAwesome name={ownerHasListings ? 'list-ul' : 'plus'} size={11} color={COLORS.white} />
                  </View>
                  <Text style={styles.gridActionText}>{ownerHasListings ? 'My Listings' : 'Enter My Listing'}</Text>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.15)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.gridActionBottomEdge}
                />
              </LinearGradient>
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

// ─── Brass corner pin — shared ornamental accent ─────────
// Matches the pins on the global ManilaCard and StudioOnboardingTooltip.
// Pressed-rivet look: 12px disc, warm-black drop shadow, dark border,
// cream highlight dot. Sits on top of the SVG folder at body corners.
function BrassPin({ style }) {
  return (
    <View style={[pinStyles.base, style]} pointerEvents="none">
      <LinearGradient
        colors={['#D4B66A', '#8B7035', '#5C4A1E']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 0.8, y: 1 }}
        style={pinStyles.gradient}
      >
        <View style={pinStyles.highlight} />
      </LinearGradient>
    </View>
  );
}

const pinStyles = StyleSheet.create({
  base: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.65,
    shadowRadius: 3,
    elevation: 5,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    borderWidth: 0.75,
    borderColor: 'rgba(40,25,5,0.55)',
  },
  highlight: {
    position: 'absolute',
    top: 2,
    left: 2.5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,250,225,0.9)',
  },
});

// ─── Manila folder with slide-to-corner dismiss (SVG 3.0) ─────────
const ManilaFolder = forwardRef(function ManilaFolder(
  { tabLabel, tabAlign, zIndex, angle, dismissCorner, enterOffset, dropShadow, opaque, offsetTop, offsetX, onTabPress, onDismissComplete, stickyFooter, children },
  ref
) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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

  // SVG dimensions
  const cw = containerSize.width;
  const ch = containerSize.height;
  const bodyHeight = ch > 0 ? ch - TAB_H : 0;
  const path = cw > 0 ? buildFolderPath(cw, bodyHeight, TAB_W, tabAlign) : '';

  // Tab label position (matches path builder)
  let tabLeft;
  if (tabAlign === 'left') {
    tabLeft = BODY_R;
  } else {
    tabLeft = cw - BODY_R - TAB_W - 20;
  }

  // Unique gradient IDs per folder (so L1 and L2 don't collide)
  const gid = tabAlign === 'left' ? 'l2' : 'l1';
  const fillOpacity = opaque ? '1' : '0.93';

  return (
    <Animated.View pointerEvents="box-none" style={[
      styles.folderOuter,
      { zIndex },
      offsetTop != null && { top: 99 + offsetTop },
      offsetX != null && { left: 22 + offsetX, right: 12 - offsetX },
      animStyle,
    ]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0 && (Math.abs(width - cw) > 2 || Math.abs(height - ch) > 2)) {
          setContainerSize({ width, height });
        }
      }}
    >
      <View style={{ flex: 1 }}>
        {/* SVG folder shape — continuous tab + body */}
        {cw > 0 && (
          <Svg width={cw} height={ch} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              {/* Manila gradient — semi-transparent for grid peek-through */}
              <SvgGradient id={`mg_${gid}`} x1="0" y1="0" x2="0.6" y2="1">
                <Stop offset="0" stopColor="#E2D0A0" stopOpacity={fillOpacity} />
                <Stop offset="0.15" stopColor="#DECA92" stopOpacity={fillOpacity} />
                <Stop offset="0.35" stopColor="#E8D8A4" stopOpacity={fillOpacity} />
                <Stop offset="0.55" stopColor="#D8C88E" stopOpacity={fillOpacity} />
                <Stop offset="0.75" stopColor="#C4AD78" stopOpacity={fillOpacity} />
                <Stop offset="1" stopColor="#A89050" stopOpacity={fillOpacity} />
              </SvgGradient>
              {/* Diagonal light source */}
              <SvgGradient id={`ls_${gid}`} x1="0" y1="0" x2="0.5" y2="0.5">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
                <Stop offset="0.3" stopColor="#FFFFFF" stopOpacity="0.06" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </SvgGradient>
              {/* Bottom-right shadow */}
              <SvgGradient id={`bs_${gid}`} x1="0.5" y1="0.6" x2="1" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="0.7" stopColor="#000000" stopOpacity="0.06" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0.12" />
              </SvgGradient>
              {/* Tab shadow on body */}
              <SvgGradient id={`ts_${gid}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0.1" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </SvgGradient>
            </Defs>

            {/* Drop shadows */}
            {dropShadow && (
              <>
                <Path d={path} fill="rgba(0,0,0,0.18)" transform="translate(2, 4)" />
                <Path d={path} fill="rgba(0,0,0,0.08)" transform="translate(1, 2)" />
              </>
            )}

            {/* Main folder fill */}
            <Path d={path} fill={`url(#mg_${gid})`} />

            {/* Diagonal light highlight */}
            <Path d={path} fill={`url(#ls_${gid})`} />

            {/* Bottom-right depth shadow */}
            <Path d={path} fill={`url(#bs_${gid})`} />

            {/* Tab shadow strip */}
            <Rect
              x={tabLeft - 5}
              y={TAB_H}
              width={TAB_W + 10}
              height={8}
              fill={`url(#ts_${gid})`}
            />

            {/* Fold line removed — the fixed 35% position looked wrong on
                scrolling folders (L1/L2) whose body height varies with
                content. Keeping the card cleaner without it. */}

            {/* Edge highlight — warm light catching the top-left edge */}
            <Path d={path} fill="none" stroke="rgba(255,245,220,0.65)" strokeWidth="2" />
            {/* Definition stroke — strong outline for stacked card separation */}
            <Path d={path} fill="none" stroke="rgba(80,60,25,0.7)" strokeWidth="1.8" />
          </Svg>
        )}

        {/* Brass corner pins — four pressed rivets framing the folder body.
            Positioned inside the card, 11px from each corner. pointerEvents
            is off via BrassPin so they never interfere with tab/swipe/tap. */}
        {cw > 0 && (
          <>
            <BrassPin style={{ top: TAB_H + 11, left: 11 }} />
            <BrassPin style={{ top: TAB_H + 11, right: 11 }} />
            <BrassPin style={{ bottom: 11, left: 11 }} />
            <BrassPin style={{ bottom: 11, right: 11 }} />
          </>
        )}

        {/* Tab + drag handle — gesture target for swipe-to-dismiss */}
        <GestureDetector gesture={composedGesture}>
          <View>
            {/* Tab label — white sticker on the tab */}
            {cw > 0 && (
              <View style={[styles.tabLabel, { left: tabLeft, width: TAB_W }]}>
                <View style={styles.labelSticker}>
                  <Text style={styles.labelText}>{tabLabel}</Text>
                </View>
              </View>
            )}

            {/* Drag handle — at tab/body junction */}
            <View style={styles.dragHandleWrap}>
              <DragHandle />
            </View>
          </View>
        </GestureDetector>

        {/* Scrollable content — free from gesture interference */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.folderScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>

        {/* Sticky footer — primary CTA pinned outside the scroll so it
            stays visible regardless of scroll position. Optional. */}
        {stickyFooter && (
          <View style={styles.stickyFooter}>
            {stickyFooter}
          </View>
        )}
      </View>
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
    let hadCachedCoords = false;
    (async () => {
      try {
        const [l1Seen, l2Seen, cachedCoords] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_L1),
          AsyncStorage.getItem(STORAGE_KEY_L2),
          AsyncStorage.getItem('owner_cached_coords'),
        ]);

        // Show L1 only if not previously dismissed AND user has no listings
        // Authenticated owners with active listings don't need the sales pitch
        if (!l1Seen && !ownerHasListings) setShowL1(true);

        // Use cached coords immediately (no GPS wait)
        if (cachedCoords) {
          try {
            const parsed = JSON.parse(cachedCoords);
            if (parsed.latitude && parsed.longitude) {
              setCoords(parsed);
              hadCachedCoords = true;
            }
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

    // Background GPS update — non-blocking. Skipped if cached coords were
    // already loaded above, because updating coords here forces dataKey
    // (and therefore NearbyDataLayer + MapView) to remount, wiping any
    // marker-tap state the user has already accumulated. Stale coords are
    // fine for the initial map render — user can recenter via the my-
    // location button. First-mount-without-cache is the only case that
    // pays the remount cost.
    setTimeout(() => {
      if (hadCachedCoords) return;
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
    }, 0);
  }, []);

  // Auto-dismiss L1 if user gains listings (e.g. after sign-in resolves)
  useEffect(() => {
    if (ownerHasListings && showL1) {
      l1Ref.current?.dismiss();
    }
  }, [ownerHasListings, showL1]);

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

  // L1: auth-gated. If owner already has listings, route to My Listings, not Studio.
  const handleCreateListing = useCallback(() => {
    if (isAnon) return onShowAuth?.();
    if (ownerHasListings) return onNavigateListings?.();
    onNavigateCreate?.();
  }, [isAnon, ownerHasListings, onShowAuth, onNavigateListings, onNavigateCreate]);

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
          angle={0}
          offsetX={-2}
          dropShadow
          dismissCorner="right"
          onTabPress={showL1 ? handleBrowseNearby : undefined}
          onDismissComplete={() => { setShowL2(false); AsyncStorage.setItem(STORAGE_KEY_L2, '1'); }}
        >
          {/* Radar animation — enhanced with glow + extra rings */}
          <View style={styles.radarContainer}>
            {/* Outer faint rings */}
            <RadarRing delay={0} size={60} duration={2800} />
            <RadarRing delay={600} size={56} duration={2400} />
            <RadarRing delay={1200} size={52} duration={2600} />
            <RadarRing delay={1800} size={48} duration={2200} />
            {/* Warm accent ring */}
            <RadarRing delay={400} size={44} color="#F9731644" duration={3000} />
            {/* Pulsing glow behind icon */}
            <PulseGlow />
            <LinearGradient
              colors={['#3B82F6', COLORS.accent, '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.radarIcon}
            >
              <FontAwesome name="map-marker" size={28} color={COLORS.white} />
            </LinearGradient>
          </View>

          <Text style={styles.l2Heading}>
            See what's listed{'\n'}
            <Text style={styles.l2Highlight}>in your neighborhood</Text>
          </Text>

          <Text style={styles.l2Explain}>
            Your exact location is never shared with anyone.
          </Text>

          {/* Enable Location CTA — above the fold, full art treatment */}
          <Pressable testID="manila-l2-enable-location-cta" style={styles.enableBtn} onPress={handleEnableLocation}>
            {/* Base gradient — warm orange to deep amber */}
            <LinearGradient
              colors={['#FF8C38', '#F97316', COLORS.logoOrange, '#DC5A2C', '#B84A1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.enableGradient}
            >
              {/* Top shine — glossy highlight across the top */}
              <LinearGradient
                colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.enableShine}
              />
              {/* Inner glow — warm radial from center */}
              <LinearGradient
                colors={['rgba(255,200,100,0.25)', 'transparent']}
                start={{ x: 0.5, y: 0.3 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.enableInnerGlow}
              />
              <View style={styles.enableContent}>
                <View style={styles.enableIconWrap}>
                  <FontAwesome name="location-arrow" size={18} color={COLORS.white} />
                </View>
                <Text style={styles.enableText}>Enable Location</Text>
              </View>
              {/* Bottom edge darkening for 3D depth */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.15)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.enableBottomEdge}
              />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => l2Ref.current?.dismiss()} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>

          {/* Benefits — below the CTA, visible on scroll */}
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
        </ManilaFolder>
      )}

      {/* ── L1: Sales pitch (front folder, angled -2deg) ─ */}
      {showL1 && (
        <ManilaFolder
          ref={l1Ref}
          tabLabel="List For Free"
          tabAlign="right"
          zIndex={20}
          angle={0}
          enterOffset={0.3}
          offsetTop={18}
          offsetX={3}
          opaque
          dropShadow
          dismissCorner="left"
          onTabPress={handleBrowseNearby}
          onDismissComplete={() => { setShowL1(false); AsyncStorage.setItem(STORAGE_KEY_L1, '1'); }}
          stickyFooter={
            // Primary CTA pinned to folder bottom so it never falls below
            // the fold regardless of scroll. Visual treatment matches the
            // owner profile's "List Your Property" sign-in card so the
            // owner journey has one consistent hero-CTA scheme. Label flip
            // (and caption) communicates dual capability: anon may be new
            // (Create) or returning (Edit); once auth'd with listings the
            // label flips to "Open My Listings".
            <Pressable testID="manila-l1-primary-cta" onPress={handleCreateListing} style={styles.l1CtaWrap}>
              <LinearGradient
                colors={['#FF8C38', '#F97316', COLORS.logoOrange, '#DC5A2C', '#B84A1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.l1CtaGradient}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.l1CtaShine}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(255,200,100,0.25)', 'transparent']}
                  start={{ x: 0.5, y: 0.3 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.l1CtaInnerGlow}
                  pointerEvents="none"
                />
                <View style={styles.l1CtaContent}>
                  <View style={styles.l1CtaIconWrap}>
                    <Ionicons name="key-outline" size={20} color={COLORS.white} />
                  </View>
                  <Text style={styles.l1CtaHeadline}>{ownerHasListings ? 'Open\nMy Listings' : 'Create or Edit\nYour Listing'}</Text>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.95)" />
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.15)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.l1CtaBottomEdge}
                  pointerEvents="none"
                />
              </LinearGradient>
            </Pressable>
          }
        >
          <Text style={styles.l1Heading}>{'List Your Rental\nfor Free'}</Text>

          {/* Decorative ornament \u2014 line, diamond, line; vintage
              document divider feel. Sits between heading and subtitle. */}
          <View style={styles.l1HeadingOrnament}>
            <View style={styles.l1OrnamentLine} />
            <View style={styles.l1OrnamentDiamond} />
            <View style={styles.l1OrnamentLine} />
          </View>

          <Text style={styles.l1Subtitle}>
            PadMagnet matches your listing with qualified South Florida renters using smart scoring.
          </Text>

          {/* Feature bullets \u2014 stamped approval style (deep-green
              circle with white check, like an old "APPROVED" rubber
              stamp). Cut from 4 to 3: dropped "Smart matching sends your
              listing to the right renters" since it overlapped with
              bullet 1's value-prop. */}
          <View style={styles.l1Bullets}>
            {[
              'Free to list \u2014 no broker fees, no catch',
              'Average 11K+/- active listings across 5 counties',
              'One-click competitive pricing research',
            ].map((text, i) => (
              <View key={i} style={styles.l1BulletRow}>
                <View style={styles.l1BulletStamp}>
                  <FontAwesome name="check" size={9} color="#FFF7E8" />
                </View>
                <Text style={styles.l1BulletText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Competitor pricing card — riveted brass plaque with corner
              rivets, stamped title, and a tilted FREE rubber stamp on
              the PadMagnet row. */}
          <View style={styles.compCard}>
            <View style={[styles.compRivet, { top: 5, left: 5 }]} />
            <View style={[styles.compRivet, { top: 5, right: 5 }]} />
            <View style={[styles.compRivet, { bottom: 5, left: 5 }]} />
            <View style={[styles.compRivet, { bottom: 5, right: 5 }]} />

            <Text style={styles.compTitle}>Market Comparison</Text>
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
              <Text style={styles.compNamePM}>
                <Text style={{ color: COLORS.white }}>Pad</Text>
                <Text style={{ color: COLORS.deepOrange }}>Magnet</Text>
              </Text>
              <View style={styles.compFreeStamp}>
                <Text style={styles.compFreeStampText}>FREE</Text>
              </View>
            </View>
          </View>

          {/* Secondary CTA — ghost button (dashed border, transparent
              bg) dismisses L1 to expose the L2 GPS ask underneath. */}
          <Pressable testID="manila-l1-dismiss" style={styles.l1BrowseBtn} onPress={handleBrowseNearby}>
            <FontAwesome name="map-marker" size={14} color="#5C4A1E" />
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
    top: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },

  // ── Tab label (SVG 3.0) ────────────────────────────
  tabLabel: {
    position: 'absolute',
    top: 3,
    height: TAB_H - 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelSticker: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  labelText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xxs,
    color: '#3A2E14',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dragHandleWrap: {
    marginTop: TAB_H + 6,
  },
  folderScroll: {
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: 0,
    paddingBottom: LAYOUT.padding.lg,
  },
  // Sticky footer pinned at the folder's bottom edge, outside the
  // ScrollView. Horizontal padding matches folderScroll so the CTA
  // aligns with body content; bottom padding clears the brass corner
  // rivets at the bottom of the folder body.
  stickyFooter: {
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: LAYOUT.padding.sm,
    paddingBottom: LAYOUT.padding.lg + 4,
  },

  // ── L1: Sales pitch ──────────────────────────────
  l1Heading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.background,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,250,225,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  l1HeadingOrnament: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: LAYOUT.padding.sm,
  },
  l1OrnamentLine: {
    width: 32,
    height: 1.5,
    backgroundColor: '#8B7035',
  },
  l1OrnamentDiamond: {
    width: 6,
    height: 6,
    backgroundColor: '#8B7035',
    transform: [{ rotate: '45deg' }],
  },
  l1Subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.3,
    lineHeight: 18,
    marginBottom: LAYOUT.padding.md,
  },
  l1Bullets: {
    marginBottom: LAYOUT.padding.md,
  },
  l1BulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  l1BulletStamp: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2D6B30',
    borderWidth: 1.5,
    borderColor: '#1F4D22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  l1BulletText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
    flex: 1,
    letterSpacing: 0.2,
  },

  // ── Competitor card (riveted brass plaque) ────────
  compCard: {
    backgroundColor: 'rgba(58,40,16,0.08)',
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: '#8B7035',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
    position: 'relative',
  },
  compRivet: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B7035',
    borderWidth: 0.5,
    borderColor: '#5C4A1E',
  },
  compTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
    paddingVertical: 4,
    marginBottom: LAYOUT.padding.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    borderTopWidth: 1,
    borderTopColor: '#8B7035',
    borderBottomWidth: 1,
    borderBottomColor: '#8B7035',
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#A08040',
  },
  compHighlight: {
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingBottom: 0,
  },
  compName: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
  },
  compPrice: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
  },
  compNamePM: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(11,29,58,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  compFreeStamp: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#2D6B30',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#1F4D22',
    transform: [{ rotate: '-3deg' }],
  },
  compFreeStampText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: '#FFF7E8',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(11,29,58,0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },

  // ── L1 CTAs ───────────────────────────────────────
  // Primary CTA: mirrors the polished "List Your Property" sign-in card on
  // the owner profile screen — 5-color diagonal orange gradient + white
  // shine overlay + warm inner glow + dark bottom edge + 40px icon
  // circle + 2-line text + chevron. Layered overlays create dimensional
  // depth that reads as tactile rather than flat. See
  // app/(owner)/profile.js:92-130 for the source pattern.
  l1CtaWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,180,80,0.4)',
  },
  l1CtaGradient: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  l1CtaShine: {
    ...StyleSheet.absoluteFillObject,
    bottom: '50%',
  },
  l1CtaInnerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  l1CtaBottomEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
  l1CtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  l1CtaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  l1CtaHeadline: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Secondary CTA: ghost button with dashed dark-brown outline on
  // transparent bg — vintage "ALSO TRY THIS" feel that recedes behind
  // the primary CTA.
  l1BrowseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,250,225,0.55)',
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#5C4A1E',
    borderStyle: 'dashed',
    marginBottom: LAYOUT.padding.sm,
  },
  l1BrowseText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
    letterSpacing: 0.3,
  },

  // ── L2: GPS ask ───────────────────────────────────
  radarContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  pulseGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
  },
  radarIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  l2Heading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.background,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: LAYOUT.padding.md,
  },
  l2Highlight: {
    color: COLORS.background,
  },
  l2Explain: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.background,
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
    color: COLORS.background,
    flex: 1,
  },
  enableBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: LAYOUT.padding.md,
    // Warm orange glow shadow
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
    // Subtle border for definition
    borderWidth: 1,
    borderColor: 'rgba(255,180,80,0.4)',
  },
  enableGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  enableShine: {
    ...StyleSheet.absoluteFillObject,
    bottom: '50%',
  },
  enableInnerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  enableBottomEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
  enableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  enableIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  enableText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  gridActionPrimary: {
    shadowColor: '#F97316',
    borderColor: 'rgba(255,180,80,0.35)',
  },
  gridActionGradient: {
    paddingVertical: 13,
    paddingHorizontal: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  gridActionShine: {
    ...StyleSheet.absoluteFillObject,
    bottom: '50%',
  },
  gridActionBottomEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
  },
  gridActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  gridActionIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  gridActionText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
