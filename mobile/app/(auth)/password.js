import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Input, Button } from '../../components/ui';
import { signIn, updateUserRole } from '../../lib/auth';
import { saveUserRole } from '../../lib/storage';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function PasswordScreen() {
  const { email, role } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!password) return;
    setLoading(true);
    try {
      await signIn(email, password);
      // Save role locally and in user metadata
      if (role) {
        await saveUserRole(role);
        await updateUserRole(role).catch(() => {}); // non-critical
      }
      // Auth state listener will handle navigation
    } catch (err) {
      Alert.alert('Sign in failed', err.message);
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
    marginTop: 24,
  },
  registerText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  registerBold: {
    fontFamily: FONTS.body.semiBold,
    color: COLORS.accent,
  },
});
