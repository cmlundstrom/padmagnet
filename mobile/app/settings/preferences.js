import { useState, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, Button, Input } from '../../components/ui';
import usePreferences from '../../hooks/usePreferences';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const TREASURE_COAST_CITIES = [
  'Stuart', 'Port Saint Lucie', 'Jensen Beach',
  'Hobe Sound', 'Palm City', 'Fort Pierce', 'Indiantown', 'Tradition',
];

const PROPERTY_TYPES = [
  'Apartment', 'Condo', 'Townhouse', 'Single Family', 'Duplex',
];

const PET_TYPES = ['dog', 'cat', 'both'];

export default function PreferencesScreen() {
  const { preferences, loading, updatePreferences } = usePreferences();
  const alert = useAlert();
  const [form, setForm] = useState({
    budget_min: '',
    budget_max: '',
    beds_min: '',
    baths_min: '',
    property_types: [],
    preferred_cities: [],
    radius_miles: '',
    pets_required: false,
    pet_type: null,
    fenced_yard_required: false,
    furnished_preferred: null,
    min_lease_months: '',
    max_hoa: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setForm({
        budget_min: preferences.budget_min?.toString() || '',
        budget_max: preferences.budget_max?.toString() || '',
        beds_min: preferences.beds_min?.toString() || '',
        baths_min: preferences.baths_min?.toString() || '',
        property_types: preferences.property_types || [],
        preferred_cities: preferences.preferred_cities || [],
        radius_miles: preferences.radius_miles?.toString() || '15',
        pets_required: preferences.pets_required || false,
        pet_type: preferences.pet_type || null,
        fenced_yard_required: preferences.fenced_yard_required || false,
        furnished_preferred: preferences.furnished_preferred ?? null,
        min_lease_months: preferences.min_lease_months?.toString() || '',
        max_hoa: preferences.max_hoa?.toString() || '',
      });
    }
  }, [preferences]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleArrayItem = (key, item) => {
    setForm(prev => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        budget_min: form.budget_min ? parseFloat(form.budget_min) : 0,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : 5000,
        beds_min: form.beds_min ? parseInt(form.beds_min, 10) : 0,
        baths_min: form.baths_min ? parseFloat(form.baths_min) : 1,
        property_types: form.property_types,
        preferred_cities: form.preferred_cities,
        radius_miles: form.radius_miles ? parseFloat(form.radius_miles) : 15,
        pets_required: form.pets_required,
        pet_type: form.pets_required ? form.pet_type : null,
        fenced_yard_required: form.pets_required ? form.fenced_yard_required : false,
        furnished_preferred: form.furnished_preferred,
        min_lease_months: form.min_lease_months ? parseInt(form.min_lease_months, 10) : null,
        max_hoa: form.max_hoa ? parseFloat(form.max_hoa) : null,
      });
      alert('Saved', 'Your preferences have been updated. PadScores will refresh on your next swipe.');
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Preferences" showBack />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Budget */}
        <Text style={styles.sectionTitle}>Budget</Text>
        <View style={styles.row}>
          <Input
            label="Min $/mo"
            value={form.budget_min}
            onChangeText={v => update('budget_min', v)}
            keyboardType="numeric"
            placeholder="0"
            style={styles.halfInput}
          />
          <Input
            label="Max $/mo"
            value={form.budget_max}
            onChangeText={v => update('budget_max', v)}
            keyboardType="numeric"
            placeholder="5000"
            style={styles.halfInput}
          />
        </View>

        {/* Property */}
        <Text style={styles.sectionTitle}>Property</Text>
        <View style={styles.row}>
          <Input
            label="Min Beds"
            value={form.beds_min}
            onChangeText={v => update('beds_min', v)}
            keyboardType="numeric"
            placeholder="0"
            style={styles.halfInput}
          />
          <Input
            label="Min Baths"
            value={form.baths_min}
            onChangeText={v => update('baths_min', v)}
            keyboardType="numeric"
            placeholder="1"
            style={styles.halfInput}
          />
        </View>

        <Text style={styles.label}>Property Types</Text>
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map(type => (
            <Pressable
              key={type}
              style={[styles.chip, form.property_types.includes(type) && styles.chipActive]}
              onPress={() => toggleArrayItem('property_types', type)}
            >
              <Text style={[styles.chipText, form.property_types.includes(type) && styles.chipTextActive]}>
                {type}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Location */}
        <Text style={styles.sectionTitle}>Location</Text>
        <Input
          label="Search Radius (miles)"
          value={form.radius_miles}
          onChangeText={v => update('radius_miles', v)}
          keyboardType="numeric"
          placeholder="15"
        />
        <Text style={styles.label}>Preferred Cities</Text>
        <View style={styles.chipRow}>
          {TREASURE_COAST_CITIES.map(city => (
            <Pressable
              key={city}
              style={[styles.chip, form.preferred_cities.includes(city) && styles.chipActive]}
              onPress={() => toggleArrayItem('preferred_cities', city)}
            >
              <Text style={[styles.chipText, form.preferred_cities.includes(city) && styles.chipTextActive]}>
                {city}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Pets */}
        <Text style={styles.sectionTitle}>Pets</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>I have pets</Text>
          <Switch
            value={form.pets_required}
            onValueChange={v => update('pets_required', v)}
            trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }}
            thumbColor={form.pets_required ? COLORS.accent : COLORS.slate}
          />
        </View>
        {form.pets_required && (
          <>
            <Text style={styles.label}>Pet Type</Text>
            <View style={styles.chipRow}>
              {PET_TYPES.map(type => (
                <Pressable
                  key={type}
                  style={[styles.chip, form.pet_type === type && styles.chipActive]}
                  onPress={() => update('pet_type', form.pet_type === type ? null : type)}
                >
                  <Text style={[styles.chipText, form.pet_type === type && styles.chipTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Fenced yard required</Text>
              <Switch
                value={form.fenced_yard_required}
                onValueChange={v => update('fenced_yard_required', v)}
                trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }}
                thumbColor={form.fenced_yard_required ? COLORS.accent : COLORS.slate}
              />
            </View>
          </>
        )}

        {/* Features */}
        <Text style={styles.sectionTitle}>Features</Text>
        <Text style={styles.label}>Furnished</Text>
        <View style={styles.chipRow}>
          {[
            { label: 'No Preference', value: null },
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ].map(opt => (
            <Pressable
              key={String(opt.value)}
              style={[styles.chip, form.furnished_preferred === opt.value && styles.chipActive]}
              onPress={() => update('furnished_preferred', opt.value)}
            >
              <Text style={[styles.chipText, form.furnished_preferred === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Input
            label="Min Lease (months)"
            value={form.min_lease_months}
            onChangeText={v => update('min_lease_months', v)}
            keyboardType="numeric"
            placeholder="Any"
            style={styles.halfInput}
          />
          <Input
            label="Max HOA $/mo"
            value={form.max_hoa}
            onChangeText={v => update('max_hoa', v)}
            keyboardType="numeric"
            placeholder="Any"
            style={styles.halfInput}
          />
        </View>

        {/* Save */}
        <Button
          title="Save Preferences"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />

        <Text style={styles.hint}>
          Your preferences power PadScore — the closer a listing matches, the higher it scores.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: LAYOUT.padding.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginTop: LAYOUT.padding.lg,
    marginBottom: LAYOUT.padding.sm,
  },
  label: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: LAYOUT.padding.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent,
  },
  chipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.accent,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  switchLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  saveButton: {
    marginTop: LAYOUT.padding.lg,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    textAlign: 'center',
    marginTop: LAYOUT.padding.md,
  },
});
