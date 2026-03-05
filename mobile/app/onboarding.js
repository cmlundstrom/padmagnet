import { useState, useEffect } from 'react';
import { View, Text, Pressable, Switch, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Input, Button } from '../components/ui';
import { setOnboarded, savePreferences, getOnboardingStep, saveOnboardingStep } from '../lib/storage';
import { useAuth } from '../hooks/useAuth';
import useSearchZones from '../hooks/useSearchZones';
import { useAlert } from '../providers/AlertProvider';
import ZonePicker from '../components/ZonePicker';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

export default function OnboardingScreen() {
  const router = useRouter();
  const alert = useAlert();
  const { session } = useAuth();
  const { zones, addZone, removeZone } = useSearchZones();
  const [step, setStep] = useState(null); // null = loading saved step
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    budget_max: '',
    beds_min: '',
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

  const handleFinish = async () => {
    setSaving(true);
    try {
      const prefs = {
        budget_max: form.budget_max ? parseFloat(form.budget_max) : 5000,
        beds_min: form.beds_min ? parseInt(form.beds_min, 10) : 0,
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Back pill — upper right, steps 1+ */}
      {step > 0 && (
        <Pressable style={styles.backPill} onPress={() => goToStep(step - 1)}>
          <FontAwesome name="arrow-left" size={16} color={COLORS.white} />
        </Pressable>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
              <Image
                source={require('../assets/images/padmagnet-header.png')}
                style={styles.wordmark}
                contentFit="contain"
              />
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
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>Where do you want to live?</Text>
              <Text style={styles.stepHint}>Start typing a city or zip code in our service area.</Text>
              <ZonePicker zones={zones} onAddZone={addZone} onRemoveZone={removeZone} />
              <Button title="Next" onPress={() => goToStep(3)} disabled={zones.length === 0} style={styles.mainButton} />
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
    right: LAYOUT.padding.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.frostedGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    width: 360,
    height: 80,
    alignSelf: 'center',
    marginBottom: 32,
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
});
