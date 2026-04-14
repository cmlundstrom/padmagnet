import { useState, useEffect, useCallback, useRef } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator, RefreshControl, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { EqualHousingBadge } from '../../components/ui';
import PriceEditModal from '../../components/owner/PriceEditModal';
import { apiFetch } from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import TierBadge from '../../components/owner/TierBadge';
import OwnerHeader from '../../components/owner/OwnerHeader';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';

export default function OwnerListingsTab() {
  const router = useRouter();
  const alert = useAlert();
  const { session, isAnon } = useAuth();
  const { tier: ownerTier } = useSubscription();
  const [showAuth, setShowAuth] = useState(false);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priceEditListing, setPriceEditListing] = useState(null);

  // Pulsing glow for the CTA button
  const ctaGlow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaGlow, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(ctaGlow, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // ── Auto-dissolve into Listing Studio after auth ──
  const wasAnon = useRef(isAnon);
  const dissolveOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Detect transition: was anonymous → now authenticated, no listings, AND loading is done
    // Must wait for listings fetch to complete before deciding — otherwise we dissolve
    // into the studio even when the user has existing listings (still loading)
    if (wasAnon.current && !isAnon && !loading && listings.length === 0) {
      // Wait for the green auth banner to register (1.5s), then dissolve + navigate
      const timer = setTimeout(() => {
        Animated.timing(dissolveOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          router.push('/owner/create');
          setTimeout(() => dissolveOpacity.setValue(1), 500);
        });
      }, 1500);
      wasAnon.current = isAnon;
      return () => clearTimeout(timer);
    }
    wasAnon.current = isAnon;
  }, [isAnon, listings.length, loading]);

  const fetchListings = useCallback(async () => {
    try {
      const data = await apiFetch('/api/owner/listings');
      setListings(data || []);
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings();
  }, [fetchListings]);

  const handleDelist = (listing) => {
    alert(
      'De-List Rental',
      `This will remove "${[listing.street_number, listing.street_name].filter(Boolean).join(' ')}" from the tenant feed. Your listing data and photos will be preserved for easy re-listing later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'De-List',
          onPress: async () => {
            try {
              await apiFetch(`/api/owner/listings/${listing.id}/delist`, { method: 'POST' });
              handleRefresh();
            } catch (err) {
              alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleRelist = async (listing) => {
    try {
      const result = await apiFetch(`/api/owner/listings/${listing.id}/relist`, { method: 'POST' });
      if (result.action === 'resumed') {
        alert('Listing Re-Activated', `Your listing is live again with ${result.days_remaining} days remaining.`);
        handleRefresh();
      } else if (result.action === 'payment_required') {
        router.push(`/owner/upgrade`);
      }
    } catch (err) {
      alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={SCREEN.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <OwnerHeader minimal />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Listings</Text>
        {listings.some(l => l.status === 'active') && (
          <Pressable style={styles.addListingBtn} onPress={() => router.push('/owner/create')}>
            <FontAwesome name="plus" size={12} color={COLORS.white} />
            <View>
              <Text style={styles.addListingBtnText}>Add Additional</Text>
              <Text style={styles.addListingBtnText}>Rental Listing</Text>
            </View>
          </Pressable>
        )}
      </View>

      {listings.length === 0 ? (
        <Animated.View style={[styles.emptyState, { opacity: dissolveOpacity }]}>
          {/* Hero card */}
          <LinearGradient
            colors={['rgba(35,65,112,0.65)', 'rgba(44,82,136,0.60)', 'rgba(35,65,112,0.65)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyCard}
          >
            {/* Glowing icon */}
            <View style={styles.emptyIconWrap}>
              <LinearGradient
                colors={[COLORS.logoOrange, '#F97316', '#DC5A2C']}
                style={styles.emptyIconCircle}
              >
                <Ionicons name="home-outline" size={28} color={COLORS.white} />
              </LinearGradient>
            </View>

            <Text style={styles.emptyHeading}>No Listings Yet</Text>
            <Text style={styles.emptySubtitle}>
              Advertise your rental for FREE and reach thousands of Florida renters.
            </Text>

            {/* Value props */}
            <View style={styles.emptyProps}>
              {[
                { icon: 'checkmark-circle', color: COLORS.success, text: 'Free to list \u2014 no broker fees' },
                { icon: 'people', color: COLORS.accent, text: 'Smart matching with qualified renters' },
                { icon: 'trending-up', color: COLORS.brandOrange, text: 'Competitive pricing insights' },
              ].map((item, i) => (
                <View key={i} style={styles.emptyPropRow}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                  <Text style={styles.emptyPropText}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Competitor comparison mini */}
            <View style={styles.emptyCompare}>
              <Text style={styles.emptyCompareLabel}>Others charge up to $349</Text>
              <View style={styles.emptyCompareBadge}>
                <Text style={styles.emptyCompareFree}>PadMagnet is FREE</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Primary CTA — pulsing glow */}
          <Animated.View style={{
            alignSelf: 'stretch',
            borderRadius: LAYOUT.radius.xl,
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: ctaGlow.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.25] }),
            shadowRadius: ctaGlow.interpolate({ inputRange: [0, 1], outputRange: [4, 10] }),
            elevation: 6,
          }}>
            <Pressable
              style={styles.emptyCta}
              onPress={() => isAnon ? setShowAuth(true) : router.push('/owner/create')}
            >
              <LinearGradient
                colors={['#FF8C38', '#F97316', COLORS.logoOrange, '#DC5A2C', '#B84A1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyCtaGradient}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.emptyCtaShine}
                />
                <LinearGradient
                  colors={['rgba(255,200,100,0.25)', 'transparent']}
                  start={{ x: 0.5, y: 0.3 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.emptyCtaInnerGlow}
                />
                <View style={styles.emptyCtaContent}>
                  <View style={styles.emptyCtaIconWrap}>
                    <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
                  </View>
                  <Text style={styles.emptyCtaText}>Create Your First Listing</Text>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.15)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.emptyCtaBottomEdge}
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <EqualHousingBadge style={{ marginTop: 16 }} />
        </Animated.View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
          renderItem={({ item }) => (
            <OwnerListingRow
              listing={item}
              ownerTier={ownerTier}
              onView={() => router.push(`/owner/preview?listing_id=${item.id}`)}
              onEdit={() => router.push(`/owner/edit?id=${item.id}`)}
              onDelist={() => handleDelist(item)}
              onRelist={() => handleRelist(item)}
              onContinueDraft={() => router.push(`/owner/create?draft_id=${item.id}`)}
              onNearby={() => router.push(`/owner/nearby-rentals?listing_id=${item.id}`)}
              onEditPrice={() => setPriceEditListing(item)}
            />
          )}
        />
      )}

      <AuthBottomSheet
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        context="create_listing"
      />

      <PriceEditModal
        visible={!!priceEditListing}
        onClose={() => setPriceEditListing(null)}
        listing={priceEditListing}
        onPriceUpdated={(result) => {
          setListings(prev => prev.map(l =>
            l.id === result.id ? { ...l, list_price: result.list_price } : l
          ));
        }}
      />
    </SafeAreaView>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'active': return COLORS.success;
    case 'pending_review': return COLORS.slate;
    case 'draft': return COLORS.warning;
    case 'expired': return COLORS.danger;
    case 'leased': return COLORS.accent;
    default: return COLORS.slate;
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'active': return 'Approved';
    case 'pending_review': return 'Pending Review';
    case 'leased': return 'De-Listed';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function getExpiresLabel(listing) {
  if (listing.status === 'leased' && listing.days_remaining_at_delist != null) {
    const d = listing.days_remaining_at_delist;
    return d > 0 ? `${d} days saved` : 'Period used';
  }
  if (!listing.expires_at) return null;
  const days = Math.ceil((new Date(listing.expires_at) - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Expired';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function PulsingText({ style, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const color = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.white, COLORS.accent],
  });
  return <Animated.Text style={[style, { color }]}>{children}</Animated.Text>;
}

function AnimatedBarChart() {
  const Svg = require('react-native-svg').default;
  const { Line, Rect: SvgRect } = require('react-native-svg');
  const { Easing } = require('react-native');

  // 5 bars — each animates from 0 to full height, staggered
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    // Initial staggered build-in
    const buildIn = anims.map((anim, i) =>
      Animated.delay(i * 200)
    );
    anims.forEach((anim, i) => {
      Animated.sequence([
        Animated.delay(i * 200),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: false, easing: Easing.out(Easing.back(1.2)) }),
      ]).start(() => {
        // After build-in, start gentle breathing loop
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 0.85, duration: 1800 + i * 400, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
            Animated.timing(anim, { toValue: 1, duration: 1800 + i * 400, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
          ])
        ).start();
      });
    });
  }, []);

  // Bar definitions: [x, maxHeight] — ascending pattern
  const bars = [
    { x: 9, maxH: 7 },
    { x: 15, maxH: 11.5 },
    { x: 21, maxH: 16 },
    { x: 27, maxH: 21 },
    { x: 33, maxH: 25.8 },
  ];
  const barWidth = 4.5;
  const baseline = 31;

  return (
    <View style={styles.animBarWrap}>
      <Svg width="38" height="38" viewBox="0 0 44 38">
        {/* Y axis */}
        <Line x1="7" y1="4" x2="7" y2={baseline} stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
        {/* X axis */}
        <Line x1="7" y1={baseline} x2="40" y2={baseline} stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
        {/* Tick marks */}
        <Line x1="5" y1="24" x2="7" y2="24" stroke="white" strokeWidth="0.8" opacity="0.4" />
        <Line x1="5" y1="17" x2="7" y2="17" stroke="white" strokeWidth="0.8" opacity="0.4" />
        <Line x1="5" y1="10" x2="7" y2="10" stroke="white" strokeWidth="0.8" opacity="0.4" />
        {/* Bars */}
        {bars.map((bar, i) => {
          const height = anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0, bar.maxH],
          });
          const y = anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [baseline, baseline - bar.maxH],
          });
          const AnimatedRect = Animated.createAnimatedComponent(SvgRect);
          return (
            <AnimatedRect
              key={i}
              x={bar.x}
              y={y}
              width={barWidth}
              height={height}
              rx="1.5"
              fill={COLORS.success}
              opacity={0.7 + i * 0.075}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function OwnerListingRow({ listing, ownerTier, onView, onEdit, onDelist, onRelist, onContinueDraft, onNearby, onEditPrice }) {
  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province].filter(Boolean).join(', ');
  const firstPhoto = listing.photos?.[0]?.url;
  const status = listing.status || (listing.is_active ? 'active' : 'archived');
  const expiresLabel = listing.source === 'owner' ? getExpiresLabel(listing) : null;

  return (
    <View style={styles.listingRow}>
      {/* Hero photo — full width with overlay */}
      <Pressable onPress={onView}>
        <View style={styles.heroWrap}>
          {firstPhoto ? (
            <Image source={{ uri: firstPhoto }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={[styles.heroImage, styles.noPhoto]}>
              <Text style={styles.noPhotoText}>🏠</Text>
            </View>
          )}
          {/* Gradient scrim at bottom for text readability */}
          <View style={styles.heroScrim} />
          {/* Tier badge — top left */}
          {ownerTier && ownerTier !== 'free' && (
            <View style={styles.heroBadge}>
              <TierBadge tier={ownerTier} size="sm" />
            </View>
          )}
          {/* Price + address overlay */}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroPrice}>
              {listing.list_price ? `${formatCurrency(listing.list_price)}/mo` : 'Draft'}
            </Text>
            <Text style={styles.heroAddress} numberOfLines={1}>
              {address || 'No address'}{cityLine ? `, ${cityLine}` : ''}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Stats dashboard — two lines */}
      {status !== 'draft' && (
        <View style={styles.dashBlock}>
          {/* Line 1: Status + Days left + Tier */}
          <View style={styles.dashRow}>
            <View style={styles.dashItem}>
              <View style={[styles.dashDot, { backgroundColor: getStatusColor(status) }]} />
              <Text style={[styles.dashValue, { color: getStatusColor(status) }]}>
                {getStatusLabel(status)}
              </Text>
            </View>
            {expiresLabel && (
              <View style={styles.dashItem}>
                <FontAwesome name="clock-o" size={11} color={COLORS.textSecondary} />
                <Text style={styles.dashLabel}>{expiresLabel}</Text>
              </View>
            )}
            <View style={[styles.dashItem, styles.tierChip, {
              backgroundColor: ownerTier === 'premium' ? COLORS.gold + '22' : ownerTier === 'pro' ? COLORS.accent + '22' : COLORS.slate + '22',
              borderColor: ownerTier === 'premium' ? COLORS.gold + '44' : ownerTier === 'pro' ? COLORS.accent + '44' : COLORS.slate + '44',
            }]}>
              <Ionicons
                name={ownerTier === 'premium' ? 'diamond' : ownerTier === 'pro' ? 'shield-checkmark' : 'leaf-outline'}
                size={12}
                color={ownerTier === 'premium' ? COLORS.gold : ownerTier === 'pro' ? COLORS.accent : COLORS.slate}
              />
              <Text style={[styles.tierChipText, {
                color: ownerTier === 'premium' ? COLORS.gold : ownerTier === 'pro' ? COLORS.accent : COLORS.slate,
              }]}>
                {ownerTier === 'premium' ? 'Premium' : ownerTier === 'pro' ? 'Pro' : 'Free'}
              </Text>
            </View>
          </View>
          {/* Line 2: Views + Contacts */}
          <View style={styles.dashRow}>
            <View style={styles.dashItem}>
              <FontAwesome name="eye" size={11} color={COLORS.accent} />
              <Text style={styles.dashValue}>{listing.unique_view_count || 0}</Text>
              <Text style={styles.dashLabel}>Views</Text>
            </View>
            <View style={styles.dashItem}>
              <FontAwesome name="envelope-o" size={11} color={COLORS.accent} />
              <Text style={styles.dashValue}>{listing.inquiry_count || 0}</Text>
              <Text style={styles.dashLabel}>Contacts</Text>
            </View>
          </View>
        </View>
      )}
      {status === 'draft' && (
        <View style={styles.draftBannerRow}>
          <View style={[styles.statusBadge, styles.draftBadge, { backgroundColor: getStatusColor('draft') + '22' }]}>
            <Text style={[styles.statusBadgeText, styles.draftBadgeText, { color: getStatusColor('draft') }]} numberOfLines={1}>
              Listing Input Progress: Draft Mode
            </Text>
          </View>
          <Pressable style={styles.draftContinueBtn} onPress={onContinueDraft}>
            <PulsingText style={styles.draftContinueBtnText}>Continue</PulsingText>
          </Pressable>
        </View>
      )}
      <View style={[styles.listingActions, status === 'draft' && { display: 'none' }]}>
        {status === 'leased' || status === 'expired' ? (
          <View style={styles.actionGrid}>
            <Pressable style={styles.actionGridBtn} onPress={onView}>
              <Ionicons name="expand-outline" size={18} color={COLORS.white} />
              <Text style={[styles.actionGridText, { color: COLORS.white }]}>View Listing</Text>
            </Pressable>
            <Pressable style={styles.actionGridBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color={COLORS.brandOrange} />
              <Text style={[styles.actionGridText, { color: COLORS.brandOrange }]}>Edit Listing</Text>
            </Pressable>
            <Pressable style={[styles.actionGridBtn, { borderColor: COLORS.success, width: '97%' }]} onPress={onRelist}>
              <Ionicons name="refresh" size={18} color={COLORS.success} />
              <Text style={[styles.actionGridText, { color: COLORS.success }]}>
                {status === 'leased' ? 'Re-List Rental' : 'Renew Listing'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionGrid}>
            <Pressable style={styles.actionGridBtn} onPress={onView}>
              <Ionicons name="expand-outline" size={18} color={COLORS.white} />
              <Text style={[styles.actionGridText, { color: COLORS.white }]}>View Listing</Text>
            </Pressable>
            <Pressable style={styles.actionGridBtn} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color={COLORS.brandOrange} />
              <Text style={[styles.actionGridText, { color: COLORS.brandOrange }]}>Edit Listing</Text>
            </Pressable>
            <Pressable style={styles.actionGridBtn} onPress={onEditPrice}>
              <Ionicons name="pricetag-outline" size={18} color={COLORS.brandOrange} />
              <Text style={[styles.actionGridText, { color: COLORS.brandOrange }]}>Adjust Price</Text>
            </Pressable>
            <Pressable style={styles.actionGridBtn} onPress={onDelist}>
              <Ionicons name="pause-circle-outline" size={18} color={COLORS.warning} />
              <Text style={[styles.actionGridText, { color: COLORS.warning }]}>De-List</Text>
            </Pressable>
          </View>
        )}
      </View>
      {status !== 'draft' && status !== 'expired' && status !== 'leased' && (
        <Pressable style={styles.nearbyBtn} onPress={onNearby}>
          <AnimatedBarChart />
          <View style={styles.nearbyText}>
            <Text style={styles.nearbyTitle}>Nearby Active Rentals</Text>
            <Text style={styles.nearbySubtitle}>Compare local rent rates and competitive property features!</Text>
          </View>
          <View style={styles.frostBtn}>
            <FontAwesome name="arrow-right" size={16} color={COLORS.white} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
  headerTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
  },
  addListingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: LAYOUT.radius.full,
    gap: 6,
  },
  addListingBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },
  listContent: {
    padding: LAYOUT.padding.md,
    paddingBottom: 80,
  },
  listingRow: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },

  // Hero photo
  heroWrap: {
    height: 180,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
    // Gradient approximation via layered shadow
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -40 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
  },
  heroBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 5,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    zIndex: 5,
  },
  heroPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroAddress: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    marginTop: 1,
  },
  noPhoto: {
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    fontSize: 36,
  },

  // Dashboard stats block (two rows)
  dashBlock: {
    backgroundColor: COLORS.background + 'AA',
    paddingVertical: 6,
    paddingHorizontal: LAYOUT.padding.sm,
  },
  dashRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 5,
  },
  dashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierChip: {
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  tierChipText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    letterSpacing: 0.3,
  },
  dashDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dashValue: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
  },
  dashLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
  },
  listingCity: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  draftBannerRow: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  draftContinueBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: LAYOUT.radius.full,
  },
  draftContinueBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  statusStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statusColumn: {
    gap: 4,
  },
  statsColumn: {
    alignItems: 'flex-end',
    gap: 3,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.full,
  },
  statusBadgeText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
  },
  draftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  draftBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.body.bold,
  },
  expiresPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: LAYOUT.radius.sm,
  },
  expiresLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statsText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
  },
  listingActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  actionGridBtn: {
    width: '47%',
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.background + '88',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.full,
    marginHorizontal: '1.5%',
    marginBottom: 6,
  },
  actionGridText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.white,
    borderRadius: LAYOUT.radius.sm,
    marginHorizontal: 4,
    marginVertical: 6,
  },
  actionBtnText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  nearbyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.brandOrange + '08',
  },
  nearbyIcon: {
    width: 36,
    height: 36,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.brandOrange + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  animBarWrap: {
    width: 38,
    height: 38,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  nearbyText: {
    flex: 1,
  },
  nearbyTitle: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brandOrange,
    textAlign: 'center',
  },
  nearbySubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    marginTop: 1,
    textAlign: 'center',
  },
  frostBtn: {
    width: 40,
    height: 40,
    borderRadius: LAYOUT.radius.xl,
    backgroundColor: COLORS.frostedGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orangeText: {
    color: COLORS.brandOrange,
  },
  dangerBtn: {
    marginLeft: 4,
  },
  dangerBtnText: {
    color: COLORS.brandOrange,
  },

  // ── Admin preview banner ─────────────────────────────────
  previewBanner: {
    backgroundColor: COLORS.warning + '33',
    borderRadius: LAYOUT.radius.sm,
    padding: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.md,
    alignItems: 'center',
  },
  previewBannerText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Empty state ────────────────────────────────────────
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.padding.md,
  },
  emptyCard: {
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  emptyIconWrap: {
    marginBottom: LAYOUT.padding.sm,
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHeading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.xs,
  },
  emptySubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: LAYOUT.padding.md,
  },
  emptyProps: {
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: LAYOUT.padding.md,
  },
  emptyPropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyPropText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  emptyCompare: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: COLORS.background + 'CC',
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.success + '33',
    gap: 6,
  },
  emptyCompareLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  emptyCompareBadge: {
    backgroundColor: COLORS.success + '22',
    borderRadius: LAYOUT.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  emptyCompareFree: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  emptyCta: {
    alignSelf: 'stretch',
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: 'rgba(255,180,80,0.4)',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  emptyCtaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  emptyCtaShine: {
    ...StyleSheet.absoluteFillObject,
    bottom: '50%',
  },
  emptyCtaInnerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyCtaBottomEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
  emptyCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyCtaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  emptyCtaText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  browseRatesCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  browseRatesText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  nearbyPromo: {
    alignItems: 'center',
    marginTop: LAYOUT.padding.sm,
  },
  nearbyPromoText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.md,
    lineHeight: 20,
  },
  nearbyPromoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: LAYOUT.padding.sm,
    backgroundColor: COLORS.logoOrange,
    paddingHorizontal: LAYOUT.padding.xl,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.md,
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  nearbyPromoBtnText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
