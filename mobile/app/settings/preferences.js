import { useState, useEffect, useRef, useCallback } from 'react';
import useAndroidBack from '../../hooks/useAndroidBack';
import { ScrollView, View, Text, Pressable, StyleSheet, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Header, Input, Toggle } from '../../components/ui';
import usePreferences from '../../hooks/usePreferences';
import useSearchZones from '../../hooks/useSearchZones';
import ZonePicker from '../../components/ZonePicker';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../../constants/layout';

const PROPERTY_TYPES = [
  'Single Family', 'Apartment', 'Condo', 'Townhouse', 'Duplex', 'Villa', 'Mobile Home',
];

const PET_TYPES = ['dog', 'cat', 'both'];
const TEXT_DEBOUNCE_MS = 1500;

function SectionHeader({ icon, color, title }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: LAYOUT.padding.lg, marginBottom: LAYOUT.padding.sm }}>
      <View style={[styles.sectionIcon, { backgroundColor: (color || COLORS.accent) + '18' }]}>
        <Ionicons name={icon} size={16} color={color || COLORS.accent} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function PreferencesScreen() {
  useAndroidBack();
  const router = useRouter();
  const { preferences, loading, updatePreferences } = usePreferences();
  const { zones, addZone, removeZone, updateZone } = useSearchZones();

  const [form, setForm] = useState({
    budget_max: '',
    beds_min: '',
    baths_min: '',
    property_types: [],
    pets_required: false,
    pet_type: null,
    fenced_yard_required: false,
    furnished_preferred: null,
    association_preferred: null,
  });

  const [petTip, setPetTip] = useState(false);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const debounceRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const statusFadeRef = useRef(new Animated.Value(0)).current;
  const initialLoadRef = useRef(true);

  // Load server preferences into form on mount
  useEffect(() => {
    if (preferences) {
      setForm({
        budget_max: preferences.budget_max?.toString() || '',
        beds_min: preferences.beds_min?.toString() || '',
        baths_min: preferences.baths_min?.toString() || '',
        property_types: preferences.property_types || [],
        pets_required: preferences.pets_required || false,
        pet_type: preferences.pet_type || null,
        fenced_yard_required: preferences.fenced_yard_required || false,
        furnished_preferred: preferences.furnished_preferred ?? null,
        association_preferred: preferences.association_preferred ?? null,
      });
      initialLoadRef.current = false;
    }
  }, [preferences]);

  // Show/hide save status indicator
  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
      Animated.timing(statusFadeRef, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(statusFadeRef, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setSaveStatus('idle');
        });
      }, 2000);
      return () => clearTimeout(timer);
    } else if (saveStatus === 'saving') {
      Animated.timing(statusFadeRef, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [saveStatus, statusFadeRef]);

  // Build the preferences payload from current form state
  const buildPayload = useCallback((f) => ({
    budget_max: f.budget_max ? parseFloat(f.budget_max) : 5000,
    beds_min: f.beds_min ? parseInt(f.beds_min, 10) : 0,
    baths_min: f.baths_min ? parseFloat(f.baths_min) : 1,
    property_types: f.property_types,
    pets_required: f.pets_required,
    pet_type: f.pets_required ? f.pet_type : null,
    fenced_yard_required: f.pets_required ? f.fenced_yard_required : false,
    furnished_preferred: f.furnished_preferred,
    association_preferred: f.association_preferred,
  }), []);

  // Core save function
  const doSave = useCallback(async (formSnapshot) => {
    setSaveStatus('saving');
    pendingSaveRef.current = null;
    try {
      await updatePreferences(buildPayload(formSnapshot));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [updatePreferences, buildPayload]);

  // Flush any pending debounced save immediately — returns a promise
  const flushSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingSaveRef.current) {
      await doSave(pendingSaveRef.current);
    }
  }, [doSave]);

  // Schedule a debounced save (for text inputs)
  const scheduleSave = useCallback((newForm) => {
    pendingSaveRef.current = newForm;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      doSave(newForm);
    }, TEXT_DEBOUNCE_MS);
  }, [doSave]);

  // Immediate save (for chips, switches, toggles)
  const immediateSave = useCallback((newForm) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingSaveRef.current = null;
    doSave(newForm);
  }, [doSave]);

  // Update helpers — text fields debounce, discrete fields save immediately
  const updateText = (key, value) => {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    if (!initialLoadRef.current) scheduleSave(newForm);
  };

  const updateDiscrete = (key, value) => {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    if (!initialLoadRef.current) immediateSave(newForm);
  };

  const toggleArrayItem = (key, item) => {
    setForm(prev => {
      const arr = prev[key];
      const newForm = {
        ...prev,
        [key]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
      if (!initialLoadRef.current) immediateSave(newForm);
      return newForm;
    });
  };

  // "Start Swiping" — flush pending save, then navigate
  const handleStartSwiping = async () => {
    await flushSave();
    router.replace('/(tenant)/swipe?refresh=true');
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Preferences" showBack />

      {/* Save status indicator */}
      <Animated.View style={[styles.statusBar, { opacity: statusFadeRef }]} pointerEvents="none">
        {saveStatus === 'saving' && (
          <Text style={styles.statusText}>Saving...</Text>
        )}
        {saveStatus === 'saved' && (
          <Text style={[styles.statusText, styles.statusSaved]}>
            <FontAwesome name="check" size={11} color={COLORS.success} />  Saved
          </Text>
        )}
        {saveStatus === 'error' && (
          <Text style={[styles.statusText, styles.statusError]}>Save failed — will retry</Text>
        )}
      </Animated.View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        <Text style={styles.introText}>
          Build your perfect search. Set your Preferences and let PadScore™ rank every matching rental just for you!
        </Text>

        {/* Budget */}
        <SectionHeader icon="cash-outline" color={COLORS.success} title="Budget" />
        <Input
          testID="preferences-budget-max-input"
          label="Max $/mo"
          value={form.budget_max}
          onChangeText={v => updateText('budget_max', v)}
          keyboardType="numeric"
          placeholder="5000"
        />

        {/* Property */}
        <SectionHeader icon="home-outline" color={COLORS.accent} title="Property" />
        <View style={styles.row}>
          <Input
            label="Min Beds"
            value={form.beds_min}
            onChangeText={v => updateText('beds_min', v)}
            keyboardType="numeric"
            placeholder="0"
            style={styles.halfInput}
          />
          <Input
            label="Min Baths"
            value={form.baths_min}
            onChangeText={v => updateText('baths_min', v)}
            keyboardType="numeric"
            placeholder="1"
            style={styles.halfInput}
          />
        </View>

        <Text style={styles.label}>Preferred Property Types</Text>
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map(type => {
            // Slug for testID — "Single Family" → "single-family",
            // "Mobile Home" → "mobile-home". Stable across renames
            // since it's derived from the canonical PROPERTY_TYPES list.
            const slug = type.toLowerCase().replace(/\s+/g, '-');
            const selected = form.property_types.includes(type);
            return (
              <Pressable
                key={type}
                testID={`preferences-property-type-${slug}`}
                style={[CHIP_STYLES.chip, selected && CHIP_STYLES.chipActive]}
                onPress={() => toggleArrayItem('property_types', type)}
              >
                {selected && (
                  // 1x1 invisible View — exists solely as an a11y-tree
                  // landmark that smokes can assert on to detect the
                  // "selected" state. RN won't surface a bare empty
                  // View to the a11y tree without explicit dimensions
                  // + accessible=true. Same pattern as styles.radioInner
                  // in notifications.js, just minimal here since the
                  // chip already has its own visual selected state.
                  <View
                    testID={`preferences-property-type-${slug}-selected`}
                    accessible
                    style={{ width: 1, height: 1 }}
                  />
                )}
                <Text style={[CHIP_STYLES.chipText, selected && CHIP_STYLES.chipTextActive]}>
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Location */}
        <SectionHeader icon="location-outline" color={COLORS.brandOrange} title="Location" />
        <Text style={styles.label}>Where do you want to live? (three areas max)</Text>
        <ZonePicker zones={zones} onAddZone={addZone} onRemoveZone={removeZone} onUpdateZone={updateZone} />

        {/* Features */}
        <SectionHeader icon="sparkles-outline" color={COLORS.accent} title="Features" />
        <Text style={styles.label}>Furnished</Text>
        <View style={styles.chipRow}>
          {[
            { label: 'No Preference', value: null },
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ].map(opt => (
            <Pressable
              key={String(opt.value)}
              style={[CHIP_STYLES.chip, form.furnished_preferred === opt.value && CHIP_STYLES.chipActive]}
              onPress={() => updateDiscrete('furnished_preferred', opt.value)}
            >
              <Text style={[CHIP_STYLES.chipText, form.furnished_preferred === opt.value && CHIP_STYLES.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Pets */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.sectionIcon, { backgroundColor: COLORS.brandOrange + '18' }]}>
            <Ionicons name="paw-outline" size={16} color={COLORS.brandOrange} />
          </View>
          <Text style={styles.sectionTitle}>Pets</Text>
          <Pressable onPress={() => setPetTip(prev => !prev)} hitSlop={10}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.brandOrange} />
          </Pressable>
        </View>
        {petTip && (
          <View style={{
            backgroundColor: COLORS.brandOrange + '15',
            borderWidth: 1,
            borderColor: COLORS.brandOrange + '44',
            borderRadius: LAYOUT.radius.md,
            padding: 12,
            marginBottom: 10,
          }}>
            <Text style={{
              fontFamily: FONTS.body.regular,
              fontSize: FONT_SIZES.xs,
              color: COLORS.brandOrange,
              lineHeight: 18,
            }}>
              We love pets too! So we built this filter to help find rentals advertised as Pet Friendly. Note: Turning on this filter WILL LIMIT your available rental results to ONLY rentals advertised as Pet Friendly. Use with caution!
            </Text>
          </View>
        )}
        <View style={styles.switchRow}>
          <Toggle
            label="I have pets"
            value={form.pets_required}
            onValueChange={v => updateDiscrete('pets_required', v)}
          />
        </View>
        {form.pets_required && (
          <>
            <Text style={styles.label}>Pet Type</Text>
            <View style={styles.chipRow}>
              {PET_TYPES.map(type => (
                <Pressable
                  key={type}
                  style={[CHIP_STYLES.chip, form.pet_type === type && CHIP_STYLES.chipActive]}
                  onPress={() => updateDiscrete('pet_type', form.pet_type === type ? null : type)}
                >
                  <Text style={[CHIP_STYLES.chipText, form.pet_type === type && CHIP_STYLES.chipTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Toggle
                label="Fenced yard required"
                value={form.fenced_yard_required}
                onValueChange={v => updateDiscrete('fenced_yard_required', v)}
              />
            </View>
          </>
        )}

        {/* Association */}
        <SectionHeader icon="business-outline" color={COLORS.slate} title="Owner Association Preference" />
        <Text style={styles.hintInline}>
          Associations (HOA/COA) have community rules tenants must follow.
        </Text>
        <View style={styles.chipRow}>
          {[
            { label: 'No Preference', value: null },
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ].map(opt => (
            <Pressable
              key={String(opt.value)}
              style={[CHIP_STYLES.chip, form.association_preferred === opt.value && CHIP_STYLES.chipActive]}
              onPress={() => updateDiscrete('association_preferred', opt.value)}
            >
              <Text style={[CHIP_STYLES.chipText, form.association_preferred === opt.value && CHIP_STYLES.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* PadScore hint */}
        <View style={styles.hintBox}>
          <Text style={styles.hintBoxText}>
            Your inputs power your PadScore™. The best homes for you will show up first!
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating "Start Swiping" button */}
      <View style={styles.floatingWrap}>
        <Pressable style={styles.floatingBtn} onPress={handleStartSwiping}>
          <FontAwesome name="bolt" size={16} color={COLORS.white} />
          <Text style={styles.floatingBtnText}>Start Swiping</Text>
        </Pressable>
      </View>
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
    paddingBottom: 155,
  },
  statusBar: {
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statusSaved: {
    color: COLORS.success,
  },
  statusError: {
    color: COLORS.danger,
  },
  introText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.sm,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
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
  hintInline: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  hintBox: {
    marginTop: LAYOUT.padding.lg,
    paddingHorizontal: LAYOUT.padding.md,
    alignItems: 'center',
  },
  hintBoxText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    textAlign: 'center',
    lineHeight: 20,
  },
  floatingWrap: {
    position: 'absolute',
    bottom: 74,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: LAYOUT.radius.full,
    borderWidth: 1,
    borderColor: COLORS.white,
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  floatingBtnText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
