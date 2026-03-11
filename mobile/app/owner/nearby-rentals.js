import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import RNMapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Image } from 'expo-image';
import { Header } from '../../components/ui';
import ListingCard from '../../components/listing/ListingCard';
import NearbyRentalsGate from '../../components/owner/NearbyRentalsGate';
import PriceEditModal from '../../components/owner/PriceEditModal';
import useNearbyRentals from '../../hooks/useNearbyRentals';
import { formatCurrency, formatBedsBaths, formatDistance } from '../../utils/format';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../../constants/layout';

const RADIUS_OPTIONS = [1, 3, 5];

export default function NearbyRentalsScreen() {
  const { listing_id } = useLocalSearchParams();
  const router = useRouter();
  const { listings, subject, access, loading, error, hasMore, loadMore, refresh, setFilters } = useNearbyRentals(listing_id);

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [radius, setRadius] = useState(3);
  const [beds, setBeds] = useState(null);
  const [baths, setBaths] = useState(null);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [ownerListing, setOwnerListing] = useState(null);
  const [selectedMapListing, setSelectedMapListing] = useState(null);

  // Build owner listing object for PriceEditModal from subject data
  const ownerListingForModal = useMemo(() => {
    if (!subject) return null;
    return ownerListing || {
      id: listing_id,
      list_price: subject.list_price,
    };
  }, [subject, listing_id, ownerListing]);

  const handleRadiusChange = useCallback((r) => {
    setRadius(r);
    setFilters({ radius: r });
  }, [setFilters]);

  const handleBedsFilter = useCallback((b) => {
    const newBeds = beds === b ? null : b;
    setBeds(newBeds);
    setFilters({ beds: newBeds });
  }, [beds, setFilters]);

  const handleBathsFilter = useCallback((b) => {
    const newBaths = baths === b ? null : b;
    setBaths(newBaths);
    setFilters({ baths: newBaths });
  }, [baths, setFilters]);

  const handlePriceUpdated = useCallback((result) => {
    setOwnerListing({ id: listing_id, list_price: result.list_price });
  }, [listing_id]);

  const handlePurchase = useCallback(() => {
    router.push('/(owner)/services');
  }, [router]);

  if (loading && listings.length === 0) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Header title="Nearby Rentals" showBack />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Header title="Nearby Rentals" showBack />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const subjectPrice = ownerListing?.list_price ?? subject?.list_price;

  // Build subject as first card in grid
  const subjectCard = subject ? {
    id: listing_id,
    list_price: subjectPrice,
    street_number: subject.street_number,
    street_name: subject.street_name,
    city: subject.city,
    bedrooms_total: subject.beds,
    bathrooms_total: subject.baths,
    living_area: subject.sqft,
    photos: subject.photos,
    days_on_market: subject.days_on_market,
    _isSubject: true,
  } : null;

  const gridData = subjectCard ? [subjectCard, ...listings] : listings;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Nearby Rentals"
        showBack
        rightAction={
          <Pressable
            style={styles.viewToggleBtn}
            onPress={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
          >
            <FontAwesome
              name={viewMode === 'grid' ? 'map-o' : 'th'}
              size={20}
              color={COLORS.white}
            />
          </Pressable>
        }
      />


      {/* Filter rows */}
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Radius</Text>
          {RADIUS_OPTIONS.map(r => (
            <Pressable
              key={`r-${r}`}
              style={[CHIP_STYLES.chip, radius === r && CHIP_STYLES.chipActive]}
              onPress={() => handleRadiusChange(r)}
            >
              <Text style={[CHIP_STYLES.chipText, radius === r && CHIP_STYLES.chipTextActive]}>
                {r} mi
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Beds</Text>
          {[1, 2, 3, 4].map(b => (
            <Pressable
              key={`bed-${b}`}
              style={[CHIP_STYLES.chip, beds === b && CHIP_STYLES.chipActive]}
              onPress={() => handleBedsFilter(b)}
            >
              <Text style={[CHIP_STYLES.chipText, beds === b && CHIP_STYLES.chipTextActive]}>
                {b === 4 ? '4+' : b} bed
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Baths</Text>
          {[1, 2, 3].map(b => (
            <Pressable
              key={`bath-${b}`}
              style={[CHIP_STYLES.chip, baths === b && CHIP_STYLES.chipActive]}
              onPress={() => handleBathsFilter(b)}
            >
              <Text style={[CHIP_STYLES.chipText, baths === b && CHIP_STYLES.chipTextActive]}>
                {b}+ bath
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {listings.length} listing{listings.length !== 1 ? 's' : ''} within {radius} mi
        </Text>
      </View>

      {/* Content area */}
      {viewMode === 'grid' ? (
        <FlatList
          data={gridData}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          onEndReached={loadMore}
          onEndReachedThreshold={1.5}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <NearbyListingCard listing={item} isSubject={item._isSubject} />
            </View>
          )}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No listings found</Text>
                <Text style={styles.emptySubtitle}>Try increasing the radius or adjusting filters.</Text>
              </View>
            )
          }
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator size="small" color={COLORS.accent} style={{ paddingVertical: 16 }} />
            ) : null
          }
        />
      ) : (
        <NearbyMap
          listings={listings}
          subject={subject}
          selectedListing={selectedMapListing}
          onMarkerPress={setSelectedMapListing}
          onDismiss={() => setSelectedMapListing(null)}
        />
      )}

      {/* Floating "Edit My Price" button */}
      <Pressable
        style={styles.floatingBtn}
        onPress={() => setPriceModalVisible(true)}
      >
        <FontAwesome name="pencil" size={16} color={COLORS.white} />
        <Text style={styles.floatingBtnText}>Edit My Price</Text>
      </Pressable>

      {/* Access gate overlay */}
      {access && !access.granted && (
        <NearbyRentalsGate access={access} onPurchase={handlePurchase} />
      )}

      {/* Price edit modal */}
      <PriceEditModal
        visible={priceModalVisible}
        onClose={() => setPriceModalVisible(false)}
        listing={ownerListingForModal}
        onPriceUpdated={handlePriceUpdated}
      />
    </SafeAreaView>
  );
}

/** Compact card for nearby listings grid — shows distance + days on market */
function NearbyListingCard({ listing, isSubject }) {
  const router = useRouter();
  const firstPhoto = listing.photos?.[0]?.url;
  const street = [listing.street_number, listing.street_name].filter(Boolean).join(' ');

  return (
    <Pressable
      style={[styles.nearbyCard, isSubject && styles.subjectCard]}
      onPress={isSubject ? null : () => router.push(`/listing/${listing.id}?context=owner_browse`)}
    >
      <View style={styles.nearbyImageContainer}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.nearbyImage} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.nearbyImage, styles.nearbyNoPhoto]}>
            <Text style={{ fontSize: 24, opacity: 0.3 }}>🏠</Text>
          </View>
        )}
        {isSubject ? (
          <View style={styles.yourPropertyBadge}>
            <Text style={styles.yourPropertyText}>Your Property</Text>
          </View>
        ) : listing.distance_miles != null ? (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{formatDistance(listing.distance_miles)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.nearbyInfo}>
        <Text style={styles.nearbyPrice} numberOfLines={1}>
          {formatCurrency(listing.list_price)}
          <Text style={styles.nearbyPerMonth}>/mo</Text>
        </Text>
        <Text style={styles.nearbyAddress} numberOfLines={2}>{street}</Text>
        {listing.city && <Text style={styles.nearbyCity} numberOfLines={1}>{listing.city}</Text>}
        <Text style={styles.nearbyDetails} numberOfLines={1}>
          {formatBedsBaths(listing.bedrooms_total, listing.bathrooms_total)}
          {listing.living_area ? ` · ${Number(listing.living_area).toLocaleString()} sqft` : ''}
        </Text>
        {listing.days_on_market != null && (
          <Text style={styles.nearbyDom}>{listing.days_on_market}d on market</Text>
        )}
      </View>
    </Pressable>
  );
}

/** Map view for nearby listings with subject property marker */
function NearbyMap({ listings, subject, selectedListing, onMarkerPress, onDismiss }) {
  const router = useRouter();
  const mappable = listings.filter(l => l.latitude && l.longitude);

  return (
    <View style={{ flex: 1 }}>
      <RNMapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: subject?.latitude || 26.7,
          longitude: subject?.longitude || -80.1,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        onPress={onDismiss}
      >
        {/* Subject property marker */}
        {subject && (
          <Marker
            coordinate={{ latitude: subject.latitude, longitude: subject.longitude }}
            pinColor={COLORS.brandOrange}
          >
            <View style={styles.subjectMarker}>
              <Text style={styles.subjectMarkerText}>YOU</Text>
            </View>
          </Marker>
        )}

        {/* Nearby listing markers */}
        {mappable.map(listing => (
          <Marker
            key={listing.id}
            coordinate={{ latitude: listing.latitude, longitude: listing.longitude }}
            onPress={() => onMarkerPress(listing)}
          >
            <View style={[
              styles.priceMarker,
              selectedListing?.id === listing.id && styles.priceMarkerSelected,
            ]}>
              <Text style={[
                styles.priceMarkerText,
                selectedListing?.id === listing.id && styles.priceMarkerTextSelected,
              ]}>
                {formatCurrency(listing.list_price)}
              </Text>
            </View>
          </Marker>
        ))}
      </RNMapView>

      {/* Selected listing preview */}
      {selectedListing && (
        <Pressable
          style={styles.mapPreview}
          onPress={() => router.push(`/listing/${selectedListing.id}?context=owner_browse`)}
        >
          <View style={styles.mapPreviewImage}>
            {selectedListing.photos?.[0]?.url ? (
              <Image source={{ uri: selectedListing.photos[0].url }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View style={[{ flex: 1 }, styles.nearbyNoPhoto]}>
                <Text style={{ fontSize: 20, opacity: 0.3 }}>🏠</Text>
              </View>
            )}
          </View>
          <View style={styles.mapPreviewInfo}>
            <Text style={styles.nearbyPrice}>
              {formatCurrency(selectedListing.list_price)}
              <Text style={styles.nearbyPerMonth}>/mo</Text>
            </Text>
            <Text style={styles.nearbyAddress} numberOfLines={1}>
              {[selectedListing.street_number, selectedListing.street_name].filter(Boolean).join(' ')}
            </Text>
            <Text style={styles.nearbyDetails} numberOfLines={1}>
              {formatBedsBaths(selectedListing.bedrooms_total, selectedListing.bathrooms_total)}
              {selectedListing.distance_miles != null ? ` · ${formatDistance(selectedListing.distance_miles)}` : ''}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  retryBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: LAYOUT.radius.sm,
  },
  retryText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  viewToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.brandOrange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },

  // Subject banner
  subjectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subjectInfo: {
    flex: 1,
    marginRight: LAYOUT.padding.sm,
  },
  subjectLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
  },
  subjectAddress: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  subjectPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },

  // Filter bar
  filterSection: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    width: 46,
  },

  // Results header
  resultsHeader: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
  resultsCount: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },

  // Grid
  gridContent: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: 80,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridItem: {
    width: '48.5%',
  },

  // Nearby card
  nearbyCard: {
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nearbyImageContainer: {
    height: 110,
    backgroundColor: COLORS.surface,
  },
  nearbyImage: {
    flex: 1,
  },
  nearbyNoPhoto: {
    backgroundColor: '#1a5276',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectCard: {
    borderWidth: 2,
    borderColor: COLORS.brandOrange,
  },
  yourPropertyBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.brandOrange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
  },
  yourPropertyText: {
    fontFamily: FONTS.body.bold,
    fontSize: 9,
    color: COLORS.white,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
  },
  distanceText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 10,
    color: COLORS.white,
  },
  nearbyInfo: {
    padding: LAYOUT.padding.sm,
  },
  nearbyPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  nearbyPerMonth: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  nearbyAddress: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginTop: 2,
  },
  nearbyCity: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  nearbyDetails: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  nearbyDom: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.slate,
    marginTop: 2,
  },

  // Floating button
  floatingBtn: {
    position: 'absolute',
    bottom: 70,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingBtnText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },

  // Map markers
  subjectMarker: {
    backgroundColor: COLORS.brandOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  subjectMarkerText: {
    fontFamily: FONTS.heading.bold,
    fontSize: 10,
    color: COLORS.white,
  },
  priceMarker: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceMarkerSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  priceMarkerText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 11,
    color: COLORS.white,
  },
  priceMarkerTextSelected: {
    color: COLORS.navy,
  },
  mapPreview: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapPreviewImage: {
    width: 90,
    height: 80,
  },
  mapPreviewInfo: {
    flex: 1,
    padding: LAYOUT.padding.sm,
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: LAYOUT.padding.sm,
  },
  emptyTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
