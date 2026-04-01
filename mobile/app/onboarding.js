import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Input, Button, Toggle, BackButton } from '../components/ui';
import StepProgress from '../components/ui/StepProgress';
import { setOnboarded, savePreferences, getOnboardingStep, saveOnboardingStep } from '../lib/storage';
import { useAuth } from '../hooks/useAuth';
import useSearchZones from '../hooks/useSearchZones';
import { useAlert } from '../providers/AlertProvider';
import ZonePicker from '../components/ZonePicker';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT, CHIP_STYLES } from '../constants/layout';

const PROPERTY_TYPES = [
  'Single Family', 'Apartment', 'Condo', 'Townhouse', 'Duplex', 'Villa', 'Mobile Home',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const alert = useAlert();
  const { session } = useAuth();
  const { zones, addZone, removeZone, updateZone } = useSearchZones();
  const [step, setStep] = useState(null); // null = loading saved step
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    budget_max: '',
    beds_min: '',
    property_types: [],
    association_preferred: null,
    pets_required: false,
  });

  // Restore saved step on mount
  useEffect(() => {
    getOnboardingStep().then(s => setStep(s));
  }, []);

  // Persist step changes
  const goToStep = (s) => {
    setStep(s);
    saveOnboardingStep(s);
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const togglePropertyType = (type) => {
    setForm(prev => {
      const arr = prev.property_types;
      return {
        ...prev,
        property_types: arr.includes(type) ? arr.filter(t => t !== type) : [...arr, type],
      };
    });
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const prefs = {
        budget_max: form.budget_max ? parseFloat(form.budget_max) : 5000,
        beds_min: form.beds_min ? parseInt(form.beds_min, 10) : 0,
        property_types: form.property_types,
        association_preferred: form.association_preferred,
        pets_required: form.pets_required,
      };
      await savePreferences(prefs);
      await setOnboarded();

      // Sync to server if authenticated
      if (session?.access_token) {
        try {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL;
          await fetch(`${apiUrl}/api/preferences`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(prefs),
          });
        } catch {
          // Non-critical — local save succeeded
        }
      }

      router.replace('/(tenant)/swipe');
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Don't render until saved step is loaded
  if (step === null) return null;

  // Steps: 0=welcome, 1=budget, 2=property type, 3=location, 4=association, 5=pets
  return (
    <SafeAreaView style={styles.container}>
      {/* Back chevron — upper left, steps 1+ */}
      {step > 0 && (
        <BackButton onPress={() => goToStep(step - 1)} />
      )}

      {/* Progress bar — steps 1-5 (skip welcome) */}
      <StepProgress
        current={step}
        steps={['Welcome', 'Budget', 'Property Type', 'Location', 'Association', 'Pets']}
        startAt={1}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            step === 0 && styles.contentCentered,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <>
              <View style={styles.brandLogo}>
                <Text style={styles.brandPad}>Pad</Text>
                <Text style={styles.brandMagnet}>Magnet</Text>
              </View>
              <Text style={styles.title}>Welcome to PadMagnet</Text>
              <Text style={styles.subtitle}>
                <Text style={styles.subtitleBold}>Your next rental should fit you perfectly.</Text>
                {'\n\n'}Provide a few basic details and we'll build your custom PadScore™, tailoring your search experience to connect you with the right homes faster.
              </Text>
              <Button title="Get Started" onPress={() => goToStep(1)} style={styles.mainButton} />
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>What's your budget?</Text>
              <Text style={styles.stepHint}>We'll prioritize listings within your range.</Text>
              <Input
                label="Max Monthly Rent"
                value={form.budget_max}
                onChangeText={v => update('budget_max', v)}
                keyboardType="numeric"
                placeholder="2500"
              />
              <Input
                label="Minimum Bedrooms"
                value={form.beds_min}
                onChangeText={v => update('beds_min', v)}
                keyboardType="numeric"
                placeholder="2"
              />
              <Button title="Next" onPress={() => goToStep(2)} style={styles.mainButton} />
              <Pressable onPress={() => goToStep(0)} style={styles.backLink}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>What kind of place feels like home?</Text>
              <Text style={styles.stepHint}>
                Pick one or more property types you'd consider. We'll only show listings that match your selections.
              </Text>
              <View style={styles.chipRow}>
                {PROPERTY_TYPES.map(type => (
                  <Pressable
                    key={type}
                    style={[CHIP_STYLES.chip, form.property_types.includes(type) && CHIP_STYLES.chipActive]}
                    onPress={() => togglePropertyType(type)}
                  >
                    <Text style={[CHIP_STYLES.chipText, form.property_types.includes(type) && CHIP_STYLES.chipTextActive]}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button
                title="Next"
                onPress={() => goToStep(3)}
                disabled={form.property_types.length === 0}
                style={styles.mainButton}
              />
              <Pressable onPress={() => goToStep(1)} style={styles.backLink}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Where do you want to live?</Text>
              <Text style={styles.stepHint}>Start typing a city or zip code in our service area.</Text>
              <ZonePicker zones={zones} onAddZone={addZone} onRemoveZone={removeZone} onUpdateZone={updateZone} />
              <Button title="Next" onPress={() => goToStep(4)} disabled={zones.length === 0} style={styles.mainButton} />
              <Pressable onPress={() => goToStep(2)} style={styles.backLink}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.stepTitle}>Owner Association Preference?</Text>
              <Text style={styles.stepHint}>
                Some properties are in a Homeowner or Condo Association (HOA/COA). These communities have rules tenants must follow. Select your preference.
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
                    onPress={() => update('association_preferred', opt.value)}
                  >
                    <Text style={[CHIP_STYLES.chipText, form.association_preferred === opt.value && CHIP_STYLES.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button title="Next" onPress={() => goToStep(5)} style={styles.mainButton} />
              <Pressable onPress={() => goToStep(3)} style={styles.backLink}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            </>
          )}

          {step === 5 && (
            <>
              <Text style={styles.stepTitle}>Do you have pets?</Text>
              <Text style={styles.stepHint}>We'll filter out pet-unfriendly listings.</Text>
              <View style={styles.switchRow}>
                <Toggle
                  label="I have pets"
                  value={form.pets_required}
                  onValueChange={v => update('pets_required', v)}
                />
              </View>
              <Button
                title="Start Swiping"
                onPress={handleFinish}
                loading={saving}
                style={styles.mainButton}
              />
              <Pressable onPress={() => goToStep(4)} style={styles.backLink}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: LAYOUT.padding.lg,
    paddingTop: 60,
  },
  contentCentered: {
    justifyContent: 'center',
    paddingTop: LAYOUT.padding.lg,
  },
  backPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    left: LAYOUT.padding.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: LAYOUT.radius.xl,
    backgroundColor: COLORS.frostedGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 32,
  },
  brandPad: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['5xl'],
    color: COLORS.white,
  },
  brandMagnet: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['5xl'],
    color: COLORS.deepOrange,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  subtitleBold: {
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
  },
  stepTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginBottom: 8,
  },
  stepHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mainButton: {
    marginTop: 24,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  backText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
  },
});
