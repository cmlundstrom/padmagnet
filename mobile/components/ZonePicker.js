import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';
import { apiFetch } from '../lib/api';

const MAX_ZONES = 3;

export default function ZonePicker({ zones = [], onAddZone, onRemoveZone }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null); // { latitude, longitude, formatted_address }
  const [radius, setRadius] = useState(15);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch('/api/geocode', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim() }),
      });
      setResult(data);
      setRadius(15);
    } catch (err) {
      setError(err.message === 'Location not found' ? 'Location not found. Try a city name or zip code.' : err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!result) return;
    try {
      await onAddZone({
        label: result.formatted_address,
        center_lat: result.latitude,
        center_lng: result.longitude,
        radius_miles: radius,
      });
      setResult(null);
      setQuery('');
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const canAddMore = zones.length < MAX_ZONES;

  return (
    <View style={styles.container}>
      {/* Saved zones list */}
      {zones.length > 0 && (
        <View style={styles.zoneList}>
          {zones.map(zone => (
            <View key={zone.id} style={styles.zoneItem}>
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneLabel} numberOfLines={1}>{zone.label}</Text>
                <Text style={styles.zoneRadius}>{parseFloat(zone.radius_miles)} mi radius</Text>
              </View>
              <Pressable onPress={() => onRemoveZone(zone.id)} hitSlop={8}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Search input — only show if can add more */}
      {canAddMore && !result && (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search a city or zip code"
              placeholderTextColor={COLORS.slate}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              autoCapitalize="words"
            />
            <Pressable
              style={[styles.searchButton, (!query.trim() || searching) && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={!query.trim() || searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </Pressable>
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </>
      )}

      {/* Map preview with radius circle */}
      {result && (
        <View style={styles.previewContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: result.latitude,
              longitude: result.longitude,
              latitudeDelta: radius / 30,
              longitudeDelta: radius / 30,
            }}
            region={{
              latitude: result.latitude,
              longitude: result.longitude,
              latitudeDelta: radius / 30,
              longitudeDelta: radius / 30,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Circle
              center={{ latitude: result.latitude, longitude: result.longitude }}
              radius={radius * 1609.34} // miles to meters
              fillColor="rgba(59, 130, 246, 0.15)"
              strokeColor={COLORS.accent}
              strokeWidth={2}
            />
          </MapView>

          <Text style={styles.addressText}>{result.formatted_address}</Text>

          <Text style={styles.sliderLabel}>Radius: {radius} miles</Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={30}
            step={1}
            value={radius}
            onValueChange={setRadius}
            minimumTrackTintColor={COLORS.accent}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.accent}
          />

          <View style={styles.previewButtons}>
            <Pressable style={styles.cancelButton} onPress={() => { setResult(null); setError(null); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.addButton} onPress={handleAdd}>
              <Text style={styles.addButtonText}>Add This Zone</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Add another prompt */}
      {zones.length > 0 && zones.length < MAX_ZONES && !result && (
        <Pressable onPress={() => setQuery('')} style={styles.addAnotherLink}>
          <Text style={styles.addAnotherText}>+ Add Another Zone ({MAX_ZONES - zones.length} remaining)</Text>
        </Pressable>
      )}

      {zones.length >= MAX_ZONES && (
        <Text style={styles.maxText}>Maximum {MAX_ZONES} zones reached</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  zoneList: {
    gap: 8,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneInfo: {
    flex: 1,
    marginRight: 12,
  },
  zoneLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  zoneRadius: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  removeText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  searchButton: {
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  errorText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
  },
  previewContainer: {
    gap: 10,
  },
  map: {
    width: '100%',
    height: 180,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
  },
  addressText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  sliderLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: LAYOUT.radius.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  addAnotherLink: {
    paddingVertical: 8,
  },
  addAnotherText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  maxText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
