import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import RNMapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../../components/ui';
import NoPhotoPlaceholder from '../../components/ui/NoPhotoPlaceholder';
import ListingCard from '../../components/listing/ListingCard';
import PriceEditModal from '../../components/owner/PriceEditModal';
import AddressAutocomplete from '../../components/owner/AddressAutocomplete';
import useNearbyRentals from '../../hooks/useNearbyRentals';
import { useAlert } from '../../providers/AlertProvider';
import { formatCurrency, formatBedsBaths, formatDistance } from '../../utils/format';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../../constants/layout';

const RADIUS_OPTIONS = [3, 5, 10];

export default function NearbyRentalsScreen() {
  const { listing_id } = useLocalSearchParams();
  const router = useRouter();
  const alert = useAlert();

  // Location-based entry mode state (only used when no listing_id)
  // 'checking' = checking existing permission, 'pending' = need permission,
  // 'current' = using GPS, 'property' = entering address,
  // 'property_results' = showing results around entered address, null = listing_id mode
  const [locationMode, setLocationMode] = useState(!listing_id ? 'checking' : null);
  const [coords, setCoords] = useState(null);
  const [propertyAddress, setPropertyAddress] = useState(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

  // On mount: check if location permission was already granted
  useEffect(() => {
    if (listing_id || locationMode !== 'checking') return;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          // Already have permission — go straight to GPS
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationMode('current');
        } else {
          // Not granted (denied or undetermined) — show branded permission screen
          setLocationMode('pending');
        }
      } catch {
        setLocationMode('pending');
      }
    })();
  }, [listing_id, locationMode]);

  // Pass listing_id for listing mode, or coords for location mode
  const hookCoords = (!listing_id && coords) ? { lat: coords.latitude, lng: coords.longitude } : {};
  const { listings, subject, access, loading, error, hasMore, loadMore, refresh, setFilters } = useNearbyRentals(
    listing_id || null,
    hookCoords
  );

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [radius, setRadius] = useState(5);
  const [beds, setBeds] = useState(null);
  const [baths, setBaths] = useState(null);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [ownerListing, setOwnerListing] = useState(null);
  const [selectedMapListing, setSelectedMapListing] = useState(null);

  // Build owner listing object for PriceEditModal from subject data
  const ownerListingForModal = useMemo(() => {
    if (!subject || !listing_id) return null;
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

  // Handle location permission request
  const handleRequestLocation = useCallback(async () => {
    setRequestingLocation(true);
    try {
      // Check if we can even ask (Android blocks after "Don't ask again")
      const { status: existingStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();

      if (existingStatus === 'granted') {
        // Already granted — just get position
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationMode('current');
        return;
      }

      if (!canAskAgain) {
        // User previously denied with "Don't ask again" — send to Settings
        alert(
          'Location Permission Required',
          'Location access was previously denied. To use this feature, please enable location in your device settings.',
          [
            { text: 'Enter Address Instead', onPress: () => setLocationMode('property') },
            { text: 'Open Settings', onPress: () => {
              // Open THIS app's settings page on Android (works in dev client + production)
              const pkg = Constants.executionEnvironment === 'storeClient'
                ? 'com.padmagnet.app'
                : (Constants.expoConfig?.android?.package || 'com.padmagnet.app');
              IntentLauncher.startActivityAsync(
                IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
                { data: `package:${pkg}` }
              ).catch(() => Linking.openSettings());
            }},
          ]
        );
        return;
      }

      // Request permission — Android will show native precise/approximate selector
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationMode('current');
      } else {
        alert(
          'Location Not Available',
          'You can still search by entering your property address.',
          [
            { text: 'Enter Address', onPress: () => setLocationMode('property') },
          ]
        );
      }
    } catch {
      alert(
        'Location Error',
        'Could not get your location. You can search by entering an address instead.',
        [{ text: 'OK', onPress: () => setLocationMode('property') }]
      );
    } finally {
      setRequestingLocation(false);
    }
  }, []);

  // Handle address selection from AddressAutocomplete
  const handleAddressSelect = useCallback(async (addr) => {
    if (addr.latitude && addr.longitude) {
      setCoords({
        latitude: addr.latitude,
        longitude: addr.longitude,
      });

      const addressData = {
        street_number: addr.street_number || '',
        street_name: addr.street_name || '',
        city: addr.city || '',
        state_or_province: addr.state_or_province || 'FL',
        postal_code: addr.postal_code || '',
        latitude: addr.latitude,
        longitude: addr.longitude,
      };

      setPropertyAddress(addressData);
      setLocationMode('property_results');

      // Cache address for Create Listing prefill
      try {
        await AsyncStorage.setItem('owner_property_address', JSON.stringify(addressData));
      } catch {
        // Non-critical
      }
    }
  }, []);

  // Format the property address for display
  const formattedAddress = useMemo(() => {
    if (!propertyAddress) return '';
    const parts = [
      propertyAddress.street_number,
      propertyAddress.street_name,
    ].filter(Boolean).join(' ');
    const cityState = [propertyAddress.city, propertyAddress.state_or_province].filter(Boolean).join(', ');
    return [parts, cityState, propertyAddress.postal_code].filter(Boolean).join(', ');
  }, [propertyAddress]);

  // --- Checking existing permission on mount ---
  if (locationMode === 'checking') {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Header title="Nearby Rentals" showBack />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  // --- Location permission screen (no listing_id, pending state) ---
  if (locationMode === 'pending') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Nearby Rentals" showBack />
        <View style={styles.permissionScreen}>
          <View style={styles.permissionIconContainer}>
            <FontAwesome name="map-marker" size={48} color={COLORS.logoOrange} />
          </View>
          <Text style={styles.permissionTitle}>See What's Listed Nearby</Text>
          <Text style={styles.permissionSubtitle}>
            PadMagnet uses your location to find competing rental listings around you.
          </Text>
          <Pressable
            style={styles.permissionBtn}
            onPress={handleRequestLocation}
            disabled={requestingLocation}
          >
            {requestingLocation ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.permissionBtnText}>Allow Location Access</Text>
            )}
          </Pressable>
          <Text style={styles.permissionDisclaimer}>
            Your location is never shared and is only used for search.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Address entry screen (no listing_id, property state — denied location or tapped address option) ---
  if (locationMode === 'property') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header title="Nearby Rentals" showBack />
        <View style={styles.addressEntryScreen}>
          <Text style={styles.addressEntryTitle}>Enter Your Property Address</Text>
          <Text style={styles.addressEntrySubtitle}>
            We'll find competing rental listings near your property.
          </Text>
          <AddressAutocomplete onSelect={handleAddressSelect} />
        </View>
      </SafeAreaView>
    );
  }

  // --- Loading state for location-based modes ---
  const isLocationMode = locationMode === 'current' || locationMode === 'property_results';
  if (isLocationMode && loading && listings.length === 0) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Header title="Nearby Rentals" showBack />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={[styles.errorText, { marginTop: 12 }]}>Finding nearby rentals...</Text>
      </SafeAreaView>
    );
  }

  // --- Standard loading state (listing_id mode) ---
  if (listing_id && loading && listings.length === 0) {
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

  // Nearby Rentals is now FREE for all tiers (freemium plan decision)

  const subjectPrice = ownerListing?.list_price ?? subject?.list_price;

  // Build subject as first card in grid (only in listing_id mode)
  const subjectCard = (listing_id && subject) ? {
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

  // Location mode banner component
  const LocationBanner = () => {
    if (locationMode === 'current') {
      return (
        <View style={styles.locationBannerCard}>
          <View style={styles.locationBannerHeader}>
            <FontAwesome name="map-marker" size={16} color={COLORS.logoOrange} />
            <View>
              <Text style={styles.locationBannerTitle}>Now Showing:</Text>
              <Text style={styles.locationBannerSubtitle}>Rentals Near Your Phone</Text>
            </View>
          </View>
          <Text style={styles.locationBannerSubtext}>
            Want to see competitive rentals near your own Rental?
          </Text>
          <Pressable
            style={styles.locationBannerBtn}
            onPress={() => setLocationMode('property')}
          >
            <Text style={styles.locationBannerBtnText}>Enter Your Property Address</Text>
            <FontAwesome name="chevron-right" size={12} color={COLORS.brandOrange} />
          </Pressable>
        </View>
      );
    }

    if (locationMode === 'property_results' && propertyAddress) {
      const streetLine = [propertyAddress.street_number, propertyAddress.street_name].filter(Boolean).join(' ');
      const cityLine = [propertyAddress.city, propertyAddress.state_or_province, propertyAddress.postal_code].filter(Boolean).join(', ');

      return (
        <View style={styles.locationBannerCard}>
          <View style={styles.locationBannerHeader}>
            <FontAwesome name="map-marker" size={16} color={COLORS.logoOrange} />
            <Text style={styles.locationBannerTitle}>Now Showing: Rentals around the Address You Entered</Text>
          </View>
          <View style={styles.addressDisplayBox}>
            <Text style={styles.addressDisplayStreet}>{streetLine}</Text>
            <Text style={styles.addressDisplayCity}>{cityLine}</Text>
          </View>
          <View style={styles.savedConfirmRow}>
            <FontAwesome name="check-circle" size={14} color={COLORS.success} />
            <Text style={styles.savedConfirmText}>
              Saved! We'll use this address to speed up your listing.
            </Text>
          </View>
          <Pressable
            style={styles.locationBannerBtn}
            onPress={() => router.push('/owner/create')}
          >
            <Text style={styles.locationBannerBtnText}>Create Your Listing</Text>
            <FontAwesome name="chevron-right" size={12} color={COLORS.brandOrange} />
          </Pressable>
          <Pressable
            style={[styles.locationBannerBtn, { marginTop: LAYOUT.padding.sm }]}
            onPress={() => setLocationMode('property')}
          >
            <Text style={styles.locationBannerBtnText}>Search Nearby Another Address</Text>
            <FontAwesome name="chevron-right" size={12} color={COLORS.brandOrange} />
          </Pressable>
        </View>
      );
    }

    return null;
  };

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
        <Text style={styles.filterSectionTitle}>Filter Views for Competitive Active Rental Listings</Text>
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
          ListHeaderComponent={isLocationMode ? <LocationBanner /> : null}
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
          coords={isLocationMode ? coords : null}
          selectedListing={selectedMapListing}
          onMarkerPress={setSelectedMapListing}
          onDismiss={() => setSelectedMapListing(null)}
        />
      )}

      {/* Floating "Edit My Price" button — only in listing_id mode */}
      {listing_id && (
        <Pressable
          style={styles.floatingBtn}
          onPress={() => setPriceModalVisible(true)}
        >
          <FontAwesome name="pencil" size={16} color={COLORS.white} />
          <Text style={styles.floatingBtnText}>Edit My Price</Text>
        </Pressable>
      )}

      {/* Price edit modal — only in listing_id mode */}
      {listing_id && (
        <PriceEditModal
          visible={priceModalVisible}
          onClose={() => setPriceModalVisible(false)}
          listing={ownerListingForModal}
          onPriceUpdated={handlePriceUpdated}
        />
      )}
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
          <NoPhotoPlaceholder size="thumb" style={styles.nearbyImage} />
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
        <Text style={styles.nearbyAddress} numberOfLines={2}>{street || 'No address'}</Text>
        <Text style={styles.nearbyCity} numberOfLines={1}>{listing.city || '—'}</Text>
        <Text style={styles.nearbyDetails} numberOfLines={1}>
          {listing.bedrooms_total === 0 ? 'Studio' : `${listing.bedrooms_total}b`} · {listing.bathrooms_total}ba
          {listing.living_area ? ` · ${Number(listing.living_area).toLocaleString()} sqft` : ''}
        </Text>
        <Text style={styles.nearbyDom}>{listing.days_on_market != null ? `${listing.days_on_market}d on market` : '—'}</Text>
      </View>
    </Pressable>
  );
}

/** Map view for nearby listings with subject property marker */
function NearbyMap({ listings, subject, coords, selectedListing, onMarkerPress, onDismiss }) {
  const router = useRouter();
  const mappable = listings.filter(l => l.latitude && l.longitude);

  // Use subject coords (listing mode) or GPS/address coords (location mode)
  const centerLat = subject?.latitude || coords?.latitude || 26.7;
  const centerLng = subject?.longitude || coords?.longitude || -80.1;

  return (
    <View style={{ flex: 1 }}>
      <RNMapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        onPress={onDismiss}
      >
        {/* Subject property marker (listing mode) */}
        {subject?.latitude && subject?.longitude && (
          <Marker
            coordinate={{ latitude: subject.latitude, longitude: subject.longitude }}
            pinColor={COLORS.brandOrange}
          >
            <View style={styles.subjectMarker}>
              <Text style={styles.subjectMarkerText}>YOU</Text>
            </View>
          </Marker>
        )}

        {/* Location marker (location mode, no subject) */}
        {!subject?.latitude && coords && (
          <Marker
            coordinate={{ latitude: coords.latitude, longitude: coords.longitude }}
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
              <NoPhotoPlaceholder size="thumb" style={{ flex: 1 }} />
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
              {selectedListing.bedrooms_total === 0 ? 'Studio' : `${selectedListing.bedrooms_total}b`} · {selectedListing.bathrooms_total}ba
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
    backgroundColor: COLORS.logoOrange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },

  // Permission screen
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.xl,
  },
  permissionIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.brandOrange + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: LAYOUT.radius.full,
    minWidth: 220,
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionBtnText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  permissionDisclaimer: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    textAlign: 'center',
  },

  // Address entry screen
  addressEntryScreen: {
    flex: 1,
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.xl,
  },
  addressEntryTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 8,
  },
  addressEntrySubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },

  // Location banner card
  locationBannerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.md,
    marginBottom: 16,
  },
  locationBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  locationBannerTitle: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  locationBannerSubtitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.brandOrange,
  },
  locationBannerSubtext: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  locationBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationBannerBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brandOrange,
  },
  addressDisplayBox: {
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm + 2,
    marginBottom: LAYOUT.padding.sm,
  },
  addressDisplayStreet: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  addressDisplayCity: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  savedConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  savedConfirmText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    flex: 1,
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
  filterSectionTitle: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: 2,
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
    width: 92,
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
    height: 280,
  },
  nearbyImageContainer: {
    height: 100,
    backgroundColor: COLORS.surface,
  },
  nearbyImage: {
    flex: 1,
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
    fontSize: FONT_SIZES.xxs,
    color: COLORS.white,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: COLORS.scrimDarker,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.sm,
  },
  distanceText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.white,
  },
  nearbyInfo: {
    padding: LAYOUT.padding.sm,
    flex: 1,
    justifyContent: 'space-between',
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
    fontSize: FONT_SIZES.xxs,
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
    shadowColor: COLORS.black,
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
    fontSize: FONT_SIZES.xxs,
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
    fontSize: FONT_SIZES.xs,
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
