import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Input } from '../ui';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const DEBOUNCE_MS = 300;

/**
 * Google Places address autocomplete.
 * Owner types an address, sees suggestions, taps one to auto-fill all fields.
 *
 * @param {function} onSelect - Called with parsed address object:
 *   { street_number, street_name, city, state_or_province, postal_code, latitude, longitude }
 */
export default function AddressAutocomplete({ onSelect }) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback(async (text) => {
    if (text.length < 3) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/api/places/autocomplete?input=${encodeURIComponent(text)}`);
      setPredictions(data.predictions || []);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback((text) => {
    setQuery(text);
    setSelected(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(text), DEBOUNCE_MS);
  }, [search]);

  const handleSelect = useCallback(async (prediction) => {
    setQuery(prediction.description);
    setPredictions([]);
    setSelected(true);
    setLoading(true);
    try {
      const address = await apiFetch(`/api/places/details?place_id=${prediction.place_id}`);
      onSelect(address);
    } catch {
      // Fallback — at least set the text
    } finally {
      setLoading(false);
    }
  }, [onSelect]);

  return (
    <View style={styles.container}>
      <Input
        label="Rental Property Address *"
        value={query}
        onChangeText={handleChange}
        placeholder="Start typing an address..."
        autoCapitalize="words"
      />
      {loading && !selected && (
        <ActivityIndicator size="small" color={COLORS.accent} style={styles.spinner} />
      )}
      {predictions.length > 0 && !selected && (
        <View style={styles.dropdown}>
          {predictions.map((item) => (
            <Pressable
              key={item.place_id}
              style={styles.suggestion}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
            </Pressable>
          ))}
          <Text style={styles.attribution}>Powered by Google</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  spinner: {
    position: 'absolute',
    right: 14,
    top: 38,
  },
  dropdown: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: -8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  attribution: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.slate,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
