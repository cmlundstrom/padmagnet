import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Input, Button } from '../../components/ui';
import { signInWithMagicLink, signInWithGoogle } from '../../lib/auth';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function EmailScreen() {
  const { role } = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const subtitleText = role === 'owner'
    ? 'Manage your properties'
    : "Let's find your next home";

  function handleEmailContinue() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    router.push({ pathname: '/(auth)/password', params: { email: trimmed, role } });
  }

  async function handleMagicLink() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setMagicLoading(true);
    try {
      await signInWithMagicLink(trimmed);
      Alert.alert(
        'Check your email',
        'We sent you a magic link. Tap it to sign in instantly.',
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setMagicLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Auth state listener will handle navigation
    } catch (err) {
      if (!err.message.includes('cancelled')) {
        Alert.alert('Error', err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleFacebook() {
    Alert.alert('Coming Soon', 'Facebook sign-in will be available in a future update.');
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/welcome')} style={styles.backPill}>
          <FontAwesome name="arrow-left" size={16} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerBrand}>
          <Text style={styles.headerPad}>Pad</Text>
          <Text style={styles.headerMagnet}>Magnet</Text>
        </View>
        <View style={styles.backSpacer} />
      </View>

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

        <Button
          title="Send Magic Link"
          variant="ghost"
          size="md"
          onPress={handleMagicLink}
          loading={magicLoading}
          style={styles.magicButton}
          textStyle={styles.magicText}
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
            <ActivityIndicator size="small" color="#333" />
          ) : (
            <FontAwesome name="google" size={28} color="#DB4437" style={styles.socialIcon} />
          )}
          <Text style={styles.socialText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialButton, styles.facebookButton]}
          onPress={handleFacebook}
          activeOpacity={0.8}
        >
          <FontAwesome name="facebook" size={28} color="#FFFFFF" style={styles.socialIcon} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 12,
  },
  backPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backSpacer: {
    width: 40,
    height: 40,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headerPad: {
    fontFamily: FONTS.heading.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  headerMagnet: {
    fontFamily: FONTS.heading.bold,
    fontSize: 18,
    color: '#F95E0C',
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
  magicButton: {
    width: '100%',
    marginTop: 8,
  },
  magicText: {
    color: COLORS.accent,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    height: 46,
    minHeight: 46,
    width: '100%',
    marginBottom: 10,
  },
  socialText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: '#333333',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  facebookText: {
    color: '#FFFFFF',
  },
  socialIcon: {
    width: 28,
    textAlign: 'center',
    marginRight: 10,
  },
});
