import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../constants/layout';
import { searchServiceAreas } from '../constants/service-areas';

const MAX_ZONES = 3;
const RADIUS_OPTIONS = [3, 7, 10, 15];
const DEFAULT_RADIUS = 10;

export default function ZonePicker({ zones = [], onAddZone, onRemoveZone, onUpdateZone }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);

  const handleChangeText = (text) => {
    setQuery(text);
    setError(null);
    if (text.trim().length >= 2) {
      setSuggestions(searchServiceAreas(text));
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = async (city) => {
    try {
      await onAddZone({
        label: `${city.name}, FL`,
        center_lat: city.lat,
        center_lng: city.lng,
        radius_miles: DEFAULT_RADIUS,
      });
      setQuery('');
      setSuggestions([]);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRadiusChange = async (zone, radius) => {
    if (!onUpdateZone || parseFloat(zone.radius_miles) === radius) return;
    try {
      await onUpdateZone(zone.id, { radius_miles: radius });
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
              <View style={styles.zoneTop}>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneLabel} numberOfLines={1}>{zone.label}</Text>
                </View>
                <Pressable onPress={() => onRemoveZone(zone.id)} hitSlop={8}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map(r => {
                  const isActive = parseFloat(zone.radius_miles) === r;
                  return (
                    <Pressable
                      key={r}
                      style={[CHIP_STYLES.chip, isActive && CHIP_STYLES.chipActive]}
                      onPress={() => handleRadiusChange(zone, r)}
                    >
                      <Text style={[CHIP_STYLES.chipText, isActive && CHIP_STYLES.chipTextActive]}>
                        {r} mi
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Search input — only show if can add more */}
      {canAddMore && (
        <>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleChangeText}
            placeholder="Search a city or zip code"
            placeholderTextColor={COLORS.slate}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {suggestions.length > 0 && (
            <ScrollView
              style={styles.suggestionList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {suggestions.map(item => (
                <Pressable
                  key={`${item.name}-${item.county}`}
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.suggestionText}>{item.name}</Text>
                  <Text style={styles.suggestionCounty}> — {item.county} County</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </>
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
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  removeText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
  },
  searchInput: {
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
  suggestionList: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 240,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  suggestionCounty: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
  },
  maxText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
