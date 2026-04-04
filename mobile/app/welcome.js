import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ImageRotator from '../components/auth/ImageRotator';
import { saveUserRole, setRoleSelected } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

const { height } = Dimensions.get('window');

const WELCOME_IMAGES = [
  require('../assets/images/welcome-1.jpg'),
  require('../assets/images/welcome-2.jpg'),
  require('../assets/images/welcome-3.jpg'),
];

// State managed by the component — set via setLoadingRole
let setLoadingRole = null;

async function handleRenterRole() {
  if (setLoadingRole) setLoadingRole(true);
  try {
    await saveUserRole('tenant');
    await setRoleSelected();

    // Check for existing session first
    const { data: { session: existing } } = await supabase.auth.getSession();
    if (existing) {
      router.replace('/(tenant)/swipe');
      return;
    }

    // Create anonymous session
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Anonymous sign-in failed:', error.message);
      router.replace('/(auth)/email');
      return;
    }
    if (data?.session) {
      // Fire and forget — don't await the profile update
      supabase.from('profiles').update({ is_anonymous: true, role: 'tenant' }).eq('id', data.session.user.id);
    }

    // Navigate immediately — AuthProvider will catch up
    router.replace('/(tenant)/swipe');
  } catch (err) {
    console.error('handleRenterRole error:', err);
    router.replace('/(auth)/email');
  }
}

async function handleOwnerRole() {
  if (setLoadingRole) setLoadingRole(true);
  try {
    await saveUserRole('owner');
    await setRoleSelected();

    // Check for existing session first
    const { data: { session: existing } } = await supabase.auth.getSession();
    if (existing) {
      router.replace('/(owner)/listings');
      return;
    }

    // Create anonymous session with owner role in metadata
    // The handle_new_user trigger reads raw_user_meta_data->>'role' to set profiles.role
    const { data, error } = await supabase.auth.signInAnonymously({
      options: { data: { role: 'owner' } },
    });
    if (error) {
      console.error('Anonymous sign-in failed:', error.message);
      router.replace({ pathname: '/(auth)/email', params: { role: 'owner' } });
      return;
    }

    // Navigate after role is set
    router.replace('/(owner)/listings');
  } catch (err) {
    console.error('handleOwnerRole error:', err);
    router.replace({ pathname: '/(auth)/email', params: { role: 'owner' } });
  }
}

export default function WelcomeScreen() {
  const [loadingRole, _setLoadingRole] = useState(false);
  setLoadingRole = _setLoadingRole;
  return (
    <View style={styles.container}>
      {/* Image rotator — top portion */}
      <View style={styles.imageSection}>
        <ImageRotator images={WELCOME_IMAGES} interval={4000} />
        <LinearGradient
          colors={['transparent', COLORS.background]}
          style={styles.gradient}
        />
      </View>

      <SafeAreaView style={styles.bottomSection} edges={['bottom']}>
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

        {/* Role buttons — modern glass style */}
        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.renterButton, loadingRole && { opacity: 0.7 }]} onPress={handleRenterRole} activeOpacity={0.85} disabled={loadingRole}>
            <View style={styles.buttonIconCircle}>
              {loadingRole ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="home" size={20} color={COLORS.white} />}
            </View>
            <View style={styles.buttonTextWrap}>
              <Text style={styles.buttonTitle}>{loadingRole ? 'Loading...' : 'Find a Rental'}</Text>
              <Text style={styles.buttonHint}>Swipe, match, and discover instantly</Text>
            </View>
            {!loadingRole && <Ionicons name="chevron-forward" size={18} color={COLORS.white} style={{ opacity: 0.5 }} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.ownerButton} onPress={handleOwnerRole} activeOpacity={0.85}>
            <View style={styles.buttonIconCircleOutline}>
              <Ionicons name="key" size={20} color={COLORS.accent} />
            </View>
            <View style={styles.buttonTextWrap}>
              <Text style={styles.buttonTitleOutline}>List My Property</Text>
              <Text style={styles.buttonHintOutline}>Find qualified renters fast</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.accent} style={{ opacity: 0.5 }} />
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
  imageSection: {
    height: height * 0.30,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.lg,
  },
  branding: {
    alignItems: 'center',
    paddingTop: 8,
  },
  icon: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  wordmarkPad: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.white,
  },
  wordmarkMagnet: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['3xl'],
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
    gap: 12,
    marginBottom: 16,
  },
  renterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: 16,
    gap: 14,
    height: 76,
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ownerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.frostedGlass,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
    gap: 14,
    height: 76,
  },
  buttonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconCircleOutline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextWrap: {
    flex: 1,
  },
  buttonTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  buttonTitleOutline: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  buttonHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  buttonHintOutline: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.sm,
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
    paddingBottom: LAYOUT.padding.sm,
  },
  trustText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
