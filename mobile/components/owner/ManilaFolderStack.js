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
                    <MaterialIcons name="assessment" size={15} color={COLORS.white} />
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
                    <FontAwesome name={ownerHasListings ? 'list-ul' : 'plus'} size={13} color={COLORS.white} />
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

// ─── Manila folder with slide-to-corner dismiss (SVG 3.0) ─────────
const ManilaFolder = forwardRef(function ManilaFolder(
  { tabLabel, tabAlign, zIndex, angle, dismissCorner, enterOffset, dropShadow, opaque, offsetTop, onTabPress, onDismissComplete, children },
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
      offsetTop != null && { top: 103 + offsetTop },
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

            {/* Fold line */}
            <Line
              x1={16}
              y1={TAB_H + ch * 0.35}
              x2={cw - 16}
              y2={TAB_H + ch * 0.35}
              stroke="rgba(120,100,60,0.12)"
              strokeWidth="1"
            />
            <Line
              x1={16}
              y1={TAB_H + ch * 0.35 - 1}
              x2={cw - 16}
              y2={TAB_H + ch * 0.35 - 1}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />

            {/* Edge highlight — warm light catching the top-left edge */}
            <Path d={path} fill="none" stroke="rgba(255,245,220,0.65)" strokeWidth="2" />
            {/* Definition stroke — strong outline for stacked card separation */}
            <Path d={path} fill="none" stroke="rgba(80,60,25,0.7)" strokeWidth="1.8" />
          </Svg>
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
          contentContainerStyle={styles.folderScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
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
          angle={-1}
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
          angle={1}
          enterOffset={0.3}
          offsetTop={10}
          opaque
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

          {/* Primary CTA — label communicates dual capability before auth, exact destination after.
              Anon users may be new (create) OR returning (edit) — "Create or Edit" covers both
              without revealing the auth gate. Once auth'd with listings, label gets specific. */}
          <Pressable testID="manila-l1-primary-cta" style={styles.l1Cta} onPress={handleCreateListing}>
            <Text style={styles.l1CtaText}>{ownerHasListings ? 'Open My Listings' : 'Create or Edit Your Listing'}</Text>
          </Pressable>

          {/* Secondary CTA — dismiss L1 to expose L2 GPS ask */}
          <Pressable testID="manila-l1-dismiss" style={styles.l1BrowseBtn} onPress={handleBrowseNearby}>
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
    top: 103,
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
    paddingHorizontal: 10,
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
    gap: 8,
  },
  gridActionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
