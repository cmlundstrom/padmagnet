import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Input, Button } from '../../components/ui';
import { resetPassword } from '../../lib/auth';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ForgotPasswordScreen() {
  const { email: prefillEmail } = useLocalSearchParams();
  const [email, setEmail] = useState(prefillEmail || '');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      Alert.alert('Check your email', 'If an account exists, we sent a password reset link.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backPill}>
          <FontAwesome name="arrow-left" size={16} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerBrand}>
          <Text style={styles.headerPad}>Pad</Text>
          <Text style={styles.headerMagnet}>Magnet</Text>
        </View>
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button
          title="Send Reset Link"
          variant="primary"
          size="lg"
          onPress={handleReset}
          loading={loading}
          style={styles.resetButton}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/email')}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>Back to sign in</Text>
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
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  resetButton: {
    width: '100%',
    marginTop: 8,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  backLinkText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
});
