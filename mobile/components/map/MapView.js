import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import RNMapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Badge } from '../ui';
import useLocation from '../../hooks/useLocation';
import { formatCurrency, formatBedsBaths } from '../../utils/format';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MapView({ listings = [], loading }) {
  const router = useRouter();
  const { location } = useLocation();
  const mapRef = useRef(null);
  const [selectedListing, setSelectedListing] = useState(null);

  const handleMarkerPress = useCallback((listing) => {
    setSelectedListing(listing);
  }, []);

  const handleCardPress = useCallback(() => {
    if (selectedListing) {
      router.push(`/listing/${selectedListing.id}`);
    }
  }, [selectedListing, router]);

  // Filter listings with valid coordinates
  const mappableListings = listings.filter(l => l.latitude && l.longitude);

  return (
    <View style={styles.container}>
      <RNMapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
        onPress={() => setSelectedListing(null)}
      >
        {mappableListings.map(listing => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: listing.latitude,
              longitude: listing.longitude,
            }}
            onPress={() => handleMarkerPress(listing)}
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

      {/* Selected listing preview card */}
      {selectedListing && (
        <Pressable style={styles.previewCard} onPress={handleCardPress}>
          <View style={styles.previewImage}>
            {selectedListing.photos?.[0]?.url ? (
              <Image
                source={{ uri: selectedListing.photos[0].url }}
                style={styles.previewImageInner}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.previewImageInner, styles.noPhoto]}>
                <Text style={styles.noPhotoText}>No Photo</Text>
              </View>
            )}
          </View>
          <View style={styles.previewInfo}>
            <View style={styles.previewTop}>
              <Text style={styles.previewPrice}>
                {formatCurrency(selectedListing.list_price)}
                <Text style={styles.perMonth}>/mo</Text>
              </Text>
              {selectedListing.padScore && (
                <Badge score={selectedListing.padScore.score} size="sm" />
              )}
            </View>
            <Text style={styles.previewAddress} numberOfLines={1}>
              {[selectedListing.street_number, selectedListing.street_name].filter(Boolean).join(' ')}
            </Text>
            <Text style={styles.previewDetails} numberOfLines={1}>
              {formatBedsBaths(selectedListing.bedrooms_total, selectedListing.bathrooms_total)}
              {selectedListing.living_area ? ` · ${Number(selectedListing.living_area).toLocaleString()} sqft` : ''}
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
  },
  map: {
    flex: 1,
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
  previewCard: {
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
  previewImage: {
    width: 100,
    height: 90,
  },
  previewImageInner: {
    flex: 1,
  },
  noPhoto: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  previewInfo: {
    flex: 1,
    padding: LAYOUT.padding.sm,
    justifyContent: 'center',
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  perMonth: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  previewAddress: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  previewDetails: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
