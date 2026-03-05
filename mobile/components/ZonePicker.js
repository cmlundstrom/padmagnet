import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';
import { searchServiceAreas } from '../constants/service-areas';

const MAX_ZONES = 3;

export default function ZonePicker({ zones = [], onAddZone, onRemoveZone }) {
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
        radius_miles: 15,
      });
      setQuery('');
      setSuggestions([]);
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
            <FlatList
              data={suggestions}
              keyExtractor={(item) => `${item.name}-${item.county}`}
              keyboardShouldPersistTaps="handled"
              style={styles.suggestionList}
              renderItem={({ item }) => (
                <Pressable style={styles.suggestionItem} onPress={() => handleSelect(item)}>
                  <Text style={styles.suggestionText}>{item.name}</Text>
                  <Text style={styles.suggestionCounty}> — {item.county} County</Text>
                </Pressable>
              )}
            />
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
