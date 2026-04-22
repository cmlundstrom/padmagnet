import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Input, Button, AuthHeader } from '../../components/ui';
import { signUp } from '../../lib/auth';
import { saveUserRole } from '../../lib/storage';
import { useAlert } from '../../providers/AlertProvider';
import useAndroidBack from '../../hooks/useAndroidBack';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function RegisterScreen() {
  const { email, role } = useLocalSearchParams();
  const alert = useAlert();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Reached via router.replace from password, so canGoBack is false —
  // fall back to the email step instead of minimizing the app.
  useAndroidBack(() => router.replace({ pathname: '/(auth)/email', params: { role } }));

  const subtitleText = role === 'owner'
    ? 'List your first property in minutes'
    : 'Free for tenants. Always.';

  async function handleRegister() {
    if (!name.trim()) {
      alert('Missing name', 'Please enter your first name.');
      return;
    }
    if (password.length < 8) {
      alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, { display_name: name.trim(), role: role || 'tenant' });
      if (role) await saveUserRole(role);
      alert(
        'Check your email',
        'We sent a verification link to ' + email + '. Please confirm your email to continue.',
        [{ text: 'OK', onPress: () => router.push({ pathname: '/(auth)/password', params: { email, role } }) }],
      );
    } catch (err) {
      alert('Registration failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <AuthHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>

          {/* Email chip (readonly) */}
          <View style={styles.emailChip}>
            <Text style={styles.emailChipText}>{email}</Text>
          </View>

          <Input
            label="First Name"
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
            autoCapitalize="words"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            secureTextEntry
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat password"
            secureTextEntry
          />

          <Button
            title="Create Account"
            variant="primary"
            size="lg"
            onPress={handleRegister}
            loading={loading}
            style={styles.createButton}
          />
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
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: LAYOUT.padding.lg,
    paddingBottom: 360,
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
    color: COLORS.accent,
    marginBottom: 24,
  },
  emailChip: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  emailChipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  createButton: {
    width: '100%',
    marginTop: 8,
  },
});
