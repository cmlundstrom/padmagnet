import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Input, Button, AuthHeader } from '../../components/ui';
import { signInWithGoogle } from '../../lib/auth';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function EmailScreen() {
  const { role } = useLocalSearchParams();
  const alert = useAlert();
  const [email, setEmail] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const subtitleText = role === 'owner'
    ? 'Manage your Rental Listings'
    : "Let's find your next home";

  function handleEmailContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    router.push({ pathname: '/(auth)/password', params: { email: trimmed, role } });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Auth state listener will handle navigation
    } catch (err) {
      if (!err.message.includes('cancelled')) {
        alert('Error', err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleFacebook() {
    alert('Coming Soon', 'Facebook sign-in will be available in a future update.');
  }

  return (
    <SafeAreaView style={styles.container}>
      <AuthHeader onBack={() => router.replace('/welcome')} />

      <View style={styles.content}>
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Button
          title="Continue with Email"
          variant="primary"
          size="lg"
          onPress={handleEmailContinue}
          style={styles.mainButton}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGoogle}
          disabled={googleLoading}
          activeOpacity={0.8}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={COLORS.socialTextDark} />
          ) : (
            <FontAwesome name="google" size={28} color={COLORS.socialGoogle} style={styles.socialIcon} />
          )}
          <Text style={styles.socialText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialButton, styles.facebookButton]}
          onPress={handleFacebook}
          activeOpacity={0.8}
        >
          <FontAwesome name="facebook" size={28} color={COLORS.white} style={styles.socialIcon} />
          <Text style={[styles.socialText, styles.facebookText]}>Continue with Facebook</Text>
        </TouchableOpacity>
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
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: 24,
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
  mainButton: {
    width: '100%',
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginHorizontal: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.xs,
    height: 46,
    minHeight: 46,
    width: '100%',
    marginBottom: 10,
  },
  socialText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.socialTextDark,
  },
  facebookButton: {
    backgroundColor: COLORS.socialFacebook,
  },
  facebookText: {
    color: COLORS.white,
  },
  socialIcon: {
    width: 28,
    textAlign: 'center',
    marginRight: 10,
  },
});
