import { useState } from 'react';
import { View, Text, Pressable, Switch, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Input, Button } from '../components/ui';
import { setOnboarded, savePreferences } from '../lib/storage';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

const CITIES = [
  'Stuart', 'Port Saint Lucie', 'Jensen Beach',
  'Hobe Sound', 'Palm City', 'Fort Pierce', 'Indiantown', 'Tradition',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    budget_max: '',
    beds_min: '',
    preferred_cities: [],
    pets_required: false,
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleCity = (city) => {
    setForm(prev => ({
      ...prev,
      preferred_cities: prev.preferred_cities.includes(city)
        ? prev.preferred_cities.filter(c => c !== city)
        : [...prev.preferred_cities, city],
    }));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const prefs = {
        budget_max: form.budget_max ? parseFloat(form.budget_max) : 5000,
        beds_min: form.beds_min ? parseInt(form.beds_min, 10) : 0,
        preferred_cities: form.preferred_cities,
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

      router.replace('/(tabs)/swipe');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <>
            <Image
              source={require('../assets/images/padmagnet-header.png')}
              style={styles.wordmark}
              contentFit="contain"
            />
            <Text style={styles.title}>Welcome to PadMagnet</Text>
            <Text style={styles.subtitle}>
              Find your perfect rental on Florida's Treasure Coast. Let's set up a few preferences so we can personalize your experience.
            </Text>
            <Button title="Get Started" onPress={() => setStep(1)} style={styles.mainButton} />
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
            <Button title="Next" onPress={() => setStep(2)} style={styles.mainButton} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>Where do you want to live?</Text>
            <Text style={styles.stepHint}>Select one or more cities.</Text>
            <View style={styles.chipRow}>
              {CITIES.map(city => (
                <Pressable
                  key={city}
                  style={[styles.chip, form.preferred_cities.includes(city) && styles.chipActive]}
                  onPress={() => toggleCity(city)}
                >
                  <Text style={[styles.chipText, form.preferred_cities.includes(city) && styles.chipTextActive]}>
                    {city}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Button title="Next" onPress={() => setStep(3)} style={styles.mainButton} />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>Do you have pets?</Text>
            <Text style={styles.stepHint}>We'll filter out pet-unfriendly listings.</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>I have pets</Text>
              <Switch
                value={form.pets_required}
                onValueChange={v => update('pets_required', v)}
                trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }}
                thumbColor={form.pets_required ? COLORS.accent : COLORS.slate}
              />
            </View>
            <Button
              title="Start Swiping"
              onPress={handleFinish}
              loading={saving}
              style={styles.mainButton}
            />
          </>
        )}

        {step > 0 && (
          <Pressable onPress={() => setStep(step - 1)} style={styles.backLink}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}

        {step === 0 && (
          <Pressable
            onPress={async () => {
              await setOnboarded();
              router.replace('/(tabs)/swipe');
            }}
            style={styles.skipLink}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.padding.lg,
  },
  wordmark: {
    width: 180,
    height: 40,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
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
  mainButton: {
    marginTop: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.accent,
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
  skipLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
  },
});
