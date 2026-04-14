import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RNMapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../ui';
import useLocation from '../../hooks/useLocation';
import { formatCurrency, formatBedsBaths } from '../../utils/format';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MapView({ listings = [], loading, initialCoords }) {
  const router = useRouter();
  const { locationOrDefault: location } = useLocation();
  const center = initialCoords || location;
  const mapRef = useRef(null);
  const [selectedListing, setSelectedListing] = useState(null);
  // Android needs tracksViewChanges=true for first render, then false for perf
  const [markersReady, setMarkersReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMarkersReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

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
        mapType="hybrid"
        showsBuildings={true}
        showsPointsOfInterest={false}
        showsTraffic={false}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
        onPress={() => setSelectedListing(null)}
      >
        {mappableListings.map(listing => {
          const isSelected = selectedListing?.id === listing.id;
          return (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: listing.latitude,
                longitude: listing.longitude,
              }}
              onPress={() => handleMarkerPress(listing)}
              tracksViewChanges={!markersReady}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerOuter}>
                {/* Price pill — floats above the structure */}
                <View style={[styles.markerPill, isSelected && styles.markerPillSelected]}>
                  <Text style={[styles.markerText, isSelected && styles.markerTextSelected]}>
                    {formatCurrency(listing.list_price)}
                  </Text>
                </View>
                {/* Thin stem connecting price to pin point */}
                <View style={[styles.markerStem, isSelected && styles.markerStemSelected]} />
                {/* Pin dot — marks exact property location */}
                <View style={[styles.markerDot, isSelected && styles.markerDotSelected]}>
                  <View style={[styles.markerDotInner, isSelected && styles.markerDotInnerSelected]} />
                </View>
              </View>
            </Marker>
          );
        })}
      </RNMapView>

      {/* Selected listing preview card */}
      {selectedListing && (
        <Pressable style={styles.previewCard} onPress={handleCardPress}>
          {/* Photo */}
          <View style={styles.previewImageWrap}>
            {selectedListing.photos?.[0]?.url ? (
              <Image
                source={{ uri: selectedListing.photos[0].url }}
                style={styles.previewImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.previewImage, styles.noPhoto]}>
                <Ionicons name="home-outline" size={28} color={COLORS.slate} />
              </View>
            )}
            {/* Gradient overlay on photo for depth */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={styles.previewPhotoGradient}
            />
            {/* Price badge on photo */}
            <View style={styles.previewPriceBadge}>
              <Text style={styles.previewPriceText}>
                {formatCurrency(selectedListing.list_price)}
                <Text style={styles.previewPerMonth}>/mo</Text>
              </Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.previewInfo}>
            <View style={styles.previewTopRow}>
              <Text style={styles.previewAddress} numberOfLines={1}>
                {[selectedListing.street_number, selectedListing.street_name].filter(Boolean).join(' ')}
              </Text>
              {selectedListing.padScore && (
                <Badge score={selectedListing.padScore.score} size="sm" />
              )}
            </View>
            {selectedListing.city && (
              <Text style={styles.previewCity} numberOfLines={1}>{selectedListing.city}</Text>
            )}
            <Text style={styles.previewDetails} numberOfLines={1}>
              {formatBedsBaths(selectedListing.bedrooms_total, selectedListing.bathrooms_total)}
              {selectedListing.living_area ? ` \u00b7 ${Number(selectedListing.living_area).toLocaleString()} sqft` : ''}
            </Text>
            {/* Tap to view */}
            <View style={styles.previewCta}>
              <Text style={styles.previewCtaText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.accent} />
            </View>
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

  // ── Price markers — stem + dot design ─────────────
  markerOuter: {
    alignItems: 'center',
  },
  markerPill: {
    backgroundColor: 'rgba(26, 51, 88, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.logoOrange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  markerPillSelected: {
    backgroundColor: COLORS.logoOrange,
    borderColor: COLORS.white,
    shadowColor: '#F97316',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  markerText: {
    fontFamily: FONTS.body.bold,
    fontSize: 11,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  markerTextSelected: {
    color: COLORS.white,
  },
  markerStem: {
    width: 2,
    height: 40,
    backgroundColor: COLORS.logoOrange,
  },
  markerStemSelected: {
    backgroundColor: COLORS.logoOrange,
  },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(249,115,22,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerDotSelected: {
    backgroundColor: 'rgba(249,115,22,0.5)',
  },
  markerDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.logoOrange,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  markerDotInnerSelected: {
    backgroundColor: COLORS.logoOrange,
  },

  // ── Preview card ─────────────────────────────────
  previewCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  previewImageWrap: {
    width: 120,
    height: 110,
    position: 'relative',
  },
  previewImage: {
    flex: 1,
  },
  previewPhotoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
  previewPriceBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewPriceText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  previewPerMonth: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: 'rgba(255,255,255,0.7)',
  },
  noPhoto: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
    padding: LAYOUT.padding.sm,
    justifyContent: 'center',
    gap: 2,
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewAddress: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  previewCity: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  previewDetails: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 1,
  },
  previewCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  previewCtaText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
  },
});
