import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Input, Button, AuthHeader } from '../../components/ui';
import { signIn } from '../../lib/auth';
import { saveUserRole } from '../../lib/storage';
import { resolvePostLoginDestination } from '../../lib/routing';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function PasswordScreen() {
  const { email, role } = useLocalSearchParams();
  const alert = useAlert();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!password) return;
    setLoading(true);
    try {
      const data = await signIn(email, password);
      // Cache role locally for offline fallback (profiles.role is source of truth)
      if (role) {
        await saveUserRole(role);
      }
      // Navigate directly to destination (skip index.js spinner)
      const dest = await resolvePostLoginDestination(data?.session, role);
      router.replace(dest);
    } catch (err) {
      alert('Sign in failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <AuthHeader />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>{email}</Text>

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />

          <Button
            title="Sign In"
            variant="primary"
            size="lg"
            onPress={handleSignIn}
            loading={loading}
            style={styles.signInButton}
          />

          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email } })}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace({ pathname: '/(auth)/register', params: { email, role } })}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: 24,
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
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  signInButton: {
    width: '100%',
    marginTop: 8,
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: LAYOUT.padding.xl,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: LAYOUT.padding.md,
    paddingHorizontal: LAYOUT.padding.lg,
  },
  registerText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  registerBold: {
    fontFamily: FONTS.heading.bold,
    color: COLORS.accent,
  },
});
