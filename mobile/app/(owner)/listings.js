import { useState, useEffect, useCallback, useRef } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator, RefreshControl, StyleSheet, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { EmptyState } from '../../components/ui';
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

export default function OwnerListingsTab() {
  const router = useRouter();
  const alert = useAlert();
  const { preview } = useLocalSearchParams();
  const { role } = useAuth();
  const { tier: ownerTier } = useSubscription();
  const isAdminPreview = preview === 'true' && ['admin', 'super_admin'].includes(role);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulse animation for the nearby rentals button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priceEditListing, setPriceEditListing] = useState(null);

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

  const handleDeactivate = (listing) => {
    alert(
      'Deactivate Listing',
      `Are you sure you want to deactivate "${[listing.street_number, listing.street_name].filter(Boolean).join(' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/owner/listings/${listing.id}`, { method: 'DELETE' });
              setListings(prev => prev.filter(l => l.id !== listing.id));
            } catch (err) {
              alert('Error', err.message);
            }
          },
        },
      ]
    );
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

      {listings.length === 0 || isAdminPreview ? (
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          {isAdminPreview && (
            <View style={styles.previewBanner}>
              <Text style={styles.previewBannerText}>Admin Preview Mode</Text>
            </View>
          )}
          <Image
            source={require('../../assets/images/padmagnet-icon-512-dark.png')}
            style={styles.emptyIcon}
            contentFit="contain"
          />
          <Text style={styles.emptyHeading}>List Your Rental for Free</Text>
          <Text style={styles.emptySubtitle}>
            PadMagnet matches your listing with qualified South Florida tenants using smart scoring.
          </Text>

          <View style={styles.featureBullets}>
            {[
              'Free to list — no broker fees, no catch',
              'Average 11K+/- active listings across 5 counties on Florida\'s Treasure and Gold Coasts',
              'Smart matching sends your listing to the right tenants',
              'One-click competitive pricing research',
            ].map((text, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.bulletText}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.compCard}>
            <Text style={styles.compCardTitle}>What others charge</Text>
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
              <Text style={[styles.compName, { color: COLORS.success, fontFamily: FONTS.body.bold }]}>PadMagnet</Text>
              <Text style={[styles.compPrice, { color: COLORS.success, fontFamily: FONTS.heading.bold }]}>FREE</Text>
            </View>
          </View>

          <Pressable
            style={styles.emptyCta}
            onPress={() => router.push('/owner/create')}
          >
            <Text style={styles.emptyCtaText}>Create Your First Listing</Text>
          </Pressable>

          <View style={styles.nearbyPromo}>
            <Text style={styles.nearbyPromoText}>
              Wondering what other rentals are priced at around you right now?
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                style={styles.nearbyPromoBtn}
                onPress={() => router.push('/owner/nearby-rentals')}
              >
                <FontAwesome name="map-marker" size={24} color={COLORS.white} />
                <Text style={styles.nearbyPromoBtnText}>Take a Look</Text>
                <FontAwesome name="chevron-right" size={12} color={COLORS.white} style={{ opacity: 0.7 }} />
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
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
              onDeactivate={() => handleDeactivate(item)}
              onContinueDraft={() => router.push(`/owner/create?draft_id=${item.id}`)}
              onRelist={() => router.push(`/owner/relist?listing_id=${item.id}`)}
              onNearby={() => router.push(`/owner/nearby-rentals?listing_id=${item.id}`)}
              onEditPrice={() => setPriceEditListing(item)}
            />
          )}
        />
      )}

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
    case 'draft': return COLORS.warning;
    case 'expired': return COLORS.danger;
    case 'leased': return COLORS.accent;
    default: return COLORS.slate;
  }
}

function getExpiresLabel(expiresAt) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));
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

function OwnerListingRow({ listing, ownerTier, onView, onEdit, onDeactivate, onContinueDraft, onRelist, onNearby, onEditPrice }) {
  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province].filter(Boolean).join(', ');
  const firstPhoto = listing.photos?.[0]?.url;
  const status = listing.status || (listing.is_active ? 'active' : 'archived');
  const expiresLabel = listing.source === 'owner' ? getExpiresLabel(listing.expires_at) : null;

  return (
    <View style={styles.listingRow}>
      <Pressable style={styles.listingContent} onPress={onView}>
        <View style={styles.listingPhoto}>
          {firstPhoto ? (
            <Image source={{ uri: firstPhoto }} style={styles.listingImage} contentFit="cover" />
          ) : (
            <View style={[styles.listingImage, styles.noPhoto]}>
              <Text style={styles.noPhotoText}>🏠</Text>
            </View>
          )}
          {ownerTier && ownerTier !== 'free' && (
            <View style={styles.thumbBadge}>
              <TierBadge tier={ownerTier} size="sm" />
            </View>
          )}
        </View>
        <View style={styles.listingInfo}>
          <Text style={styles.listingPrice}>
            {listing.list_price ? `${formatCurrency(listing.list_price)}/mo` : 'Draft'}
          </Text>
          <Text style={styles.listingAddress}>
            {address || 'No address'}{cityLine ? `, ${cityLine}` : ''}
          </Text>
        </View>
      </Pressable>
      {status !== 'draft' && (
        <View style={styles.statusStatsRow}>
          <View style={styles.statusColumn}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '22' }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(status) }]}>
                Listing: {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
            {expiresLabel && (
              <View style={styles.expiresPill}>
                <FontAwesome name="clock-o" size={11} color={COLORS.textSecondary} />
                <Text style={styles.expiresLabel}>{expiresLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.statsColumn}>
            <View style={styles.statItem}>
              <FontAwesome name="eye" size={12} color={COLORS.text} />
              <Text style={styles.statsText}>
                {listing.unique_view_count || 0} Unique Views
              </Text>
            </View>
            <View style={styles.statItem}>
              <FontAwesome name="envelope-o" size={11} color={COLORS.text} />
              <Text style={styles.statsText}>{listing.inquiry_count || 0} Contacts</Text>
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
        {status === 'expired' ? (
          <>
            <Pressable style={styles.actionBtn} onPress={onRelist}>
              <Text style={styles.actionBtnText}>Re-list</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={onDeactivate}>
              <Text style={[styles.actionBtnText, styles.dangerBtnText]}>Archive</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.actionBtn} onPress={onView}>
              <FontAwesome name="eye" size={17} color={COLORS.white} />
              <Text style={[styles.actionBtnText, { marginLeft: 4, color: COLORS.accent }]}>View</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={onEdit}>
              <FontAwesome name="pencil" size={17} color={COLORS.white} />
              <Text style={[styles.actionBtnText, styles.orangeText, { marginLeft: 4 }]}>Edit</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={onEditPrice}>
              <FontAwesome name="dollar" size={17} color={COLORS.white} />
              <Text style={[styles.actionBtnText, styles.orangeText, { marginLeft: 4 }]}>Price</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={onDeactivate}>
              <FontAwesome name="archive" size={16} color={COLORS.white} />
              <Text style={[styles.actionBtnText, styles.dangerBtnText, { marginLeft: 4 }]}>Archive</Text>
            </Pressable>
          </>
        )}
      </View>
      {status !== 'draft' && status !== 'expired' && (
        <Pressable style={styles.nearbyBtn} onPress={onNearby}>
          <View style={styles.nearbyIcon}>
            <FontAwesome name="bar-chart" size={26} color={COLORS.white} />
          </View>
          <View style={styles.nearbyText}>
            <Text style={styles.nearbyTitle}>Nearby Active Rentals</Text>
            <Text style={styles.nearbySubtitle}>See what other rentals are asking near this property</Text>
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
  },
  listingRow: {
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  listingContent: {
    flexDirection: 'row',
  },
  listingPhoto: {
    width: 100,
    height: 110,
    position: 'relative',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    zIndex: 5,
  },
  listingImage: {
    flex: 1,
  },
  noPhoto: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    fontSize: 28,
  },
  listingInfo: {
    flex: 1,
    padding: LAYOUT.padding.sm,
    justifyContent: 'center',
  },
  listingPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  listingAddress: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
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

  // ── Empty state (mini sales page) ────────────────────────
  emptyScrollContent: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: LAYOUT.padding.xl,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: LAYOUT.padding.md,
  },
  emptyHeading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  emptySubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.lg,
    lineHeight: 20,
  },
  featureBullets: {
    alignSelf: 'stretch',
    marginBottom: LAYOUT.padding.lg,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  bulletText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  compCard: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.lg,
  },
  compCardTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.padding.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  compHighlight: {
    borderBottomWidth: 0,
    paddingTop: 10,
  },
  compName: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  compPrice: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  emptyCta: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  emptyCtaText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
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
