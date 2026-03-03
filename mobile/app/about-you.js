import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Input, Button } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getUserRole, hasOnboarded } from '../lib/storage';
import { useAlert } from '../providers/AlertProvider';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

const ROLE_LABELS = {
  owner: 'Property Owner',
  tenant: 'Tenant',
};

export default function AboutYouScreen() {
  const { user } = useAuth();
  const alert = useAlert();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleLabel, setRoleLabel] = useState('');

  // Resolve role label on mount
  useEffect(() => {
    (async () => {
      const role = user?.user_metadata?.role || await getUserRole() || 'tenant';
      setRoleLabel(ROLE_LABELS[role] || role);
    })();
  }, [user]);

  async function handleContinue() {
    if (!firstName.trim()) {
      alert('Missing name', 'Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      alert('Missing name', 'Please enter your last name.');
      return;
    }

    setLoading(true);
    try {
      const first = firstName.trim();
      const last = lastName.trim();
      const displayName = `${first} ${last}`;

      // Save to Supabase user_metadata
      const { error } = await supabase.auth.updateUser({
        data: { first_name: first, last_name: last, display_name: displayName },
      });
      if (error) throw error;

      // Route to role-based destination
      const role = user?.user_metadata?.role || await getUserRole() || 'tenant';
      if (role === 'owner') {
        router.replace('/(owner)/listings');
      } else {
        const onboarded = await hasOnboarded();
        router.replace(onboarded ? '/(tenant)/swipe' : '/onboarding');
      }
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>About You</Text>
        <Text style={styles.subtitle}>
          {roleLabel ? `Signed in as ${roleLabel}` : 'Tell us your name to get started.'}
        </Text>

        <Input
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          autoCapitalize="words"
        />

        <Input
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          autoCapitalize="words"
        />

        <Button
          title="Continue"
          variant="primary"
          size="lg"
          onPress={handleContinue}
          loading={loading}
          style={styles.continueButton}
        />
      </View>
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
    paddingHorizontal: LAYOUT.padding.lg,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  continueButton: {
    width: '100%',
    marginTop: 16,
  },
});
