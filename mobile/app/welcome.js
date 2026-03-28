import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { saveUserRole, setRoleSelected } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

/**
 * Welcome / Role Selector — shown ONCE on first app open.
 * After role selection, saved to device storage and never shown again.
 * Renters: creates anonymous Supabase session → instant swipe feed.
 * Owners: routes to auth flow (owners need real identity to list).
 */

async function handleRenterRole() {
  await saveUserRole('tenant');
  await setRoleSelected();

  // Create anonymous session — renter can swipe immediately
  const { data, error } = await supabase.auth.signInAnonymously();
  if (!error && data?.session) {
    await supabase.from('profiles').update({ is_anonymous: true, role: 'tenant' }).eq('id', data.session.user.id);
  }

  router.replace('/(tenant)/swipe');
}

async function handleOwnerRole() {
  await saveUserRole('owner');
  await setRoleSelected();
  router.replace({ pathname: '/(auth)/email', params: { role: 'owner' } });
}

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        {/* Branding */}
        <View style={styles.branding}>
          <Image
            source={require('../assets/images/padmagnet-icon-512-dark.png')}
            style={styles.icon}
            contentFit="contain"
          />
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmarkPad}>Pad</Text>
            <Text style={styles.wordmarkMagnet}>Magnet</Text>
          </View>
          <Text style={styles.tagline}>
            Find Your Perfect Pad with PadScore<Text style={styles.tm}>{'\u2122'}</Text>
          </Text>
        </View>

        {/* Role buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.renterButton} onPress={handleRenterRole} activeOpacity={0.85}>
            <Ionicons name="home" size={22} color={COLORS.white} style={styles.buttonIcon} />
            <View>
              <Text style={styles.buttonTitle}>I'm Looking for a Rental Home</Text>
              <Text style={styles.buttonHint}>Swipe, match, and discover rentals instantly</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ownerButton} onPress={handleOwnerRole} activeOpacity={0.85}>
            <Ionicons name="key" size={22} color={COLORS.white} style={styles.buttonIcon} />
            <View>
              <Text style={styles.buttonTitle}>I Own Rental Property</Text>
              <Text style={styles.buttonHint}>List your property and find qualified renters</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign in link */}
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/email')}
          style={styles.signInLink}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        {/* Trust badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
          <Text style={styles.trustText}>Free for renters. Always.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 48,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  wordmarkPad: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['4xl'],
    color: COLORS.white,
  },
  wordmarkMagnet: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['4xl'],
    color: COLORS.deepOrange,
  },
  tagline: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    textAlign: 'center',
  },
  tm: {
    fontSize: FONT_SIZES.xxs,
  },
  buttons: {
    gap: 14,
    marginBottom: 24,
  },
  renterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    gap: 14,
  },
  ownerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  buttonIcon: {
    width: 28,
  },
  buttonTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  buttonHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.overlayWhiteStrong,
    marginTop: 2,
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.md,
  },
  signInText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  signInBold: {
    fontFamily: FONTS.body.semiBold,
    color: COLORS.accent,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: LAYOUT.padding.sm,
  },
  trustText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
