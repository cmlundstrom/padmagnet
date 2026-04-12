import { useState, useCallback } from 'react';
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

export default function WelcomeScreen() {
  const [loadingRenter, setLoadingRenter] = useState(false);
  const [loadingOwner, setLoadingOwner] = useState(false);

  const handleRenterRole = useCallback(async () => {
    setLoadingRenter(true);
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

      // Await profile update — ensures role is set before AuthProvider queries it
      if (data?.session) {
        try {
          await supabase.from('profiles')
            .update({ is_anonymous: true, role: 'tenant', roles: ['tenant'] })
            .eq('id', data.session.user.id);
        } catch (err) {
          console.warn('[Welcome] Profile update failed:', err.message);
        }
      }

      router.replace('/(tenant)/swipe');
    } catch (err) {
      console.error('handleRenterRole error:', err);
      router.replace('/(auth)/email');
    } finally {
      setLoadingRenter(false);
    }
  }, []);

  const handleOwnerRole = useCallback(async () => {
    setLoadingOwner(true);
    try {
      await saveUserRole('owner');
      await setRoleSelected();

      // Check for existing session first
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        router.replace('/(owner)/home');
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

      // Also explicitly set role (don't rely solely on trigger timing)
      if (data?.session) {
        try {
          await supabase.from('profiles')
            .update({ is_anonymous: true, role: 'owner', roles: ['owner'] })
            .eq('id', data.session.user.id);
        } catch (err) {
          console.warn('[Welcome] Profile update failed:', err.message);
        }
      }

      router.replace('/(owner)/home');
    } catch (err) {
      console.error('handleOwnerRole error:', err);
      router.replace({ pathname: '/(auth)/email', params: { role: 'owner' } });
    } finally {
      setLoadingOwner(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Image rotator — top portion */}
      <View style={styles.imageSection}>
        <ImageRotator images={WELCOME_IMAGES} intervalMs={5000} />
        <LinearGradient
          colors={['transparent', COLORS.navy]}
          locations={[0, 0.95]}
          style={styles.imageFade}
        />
      </View>

      {/* Bottom card content */}
      <View style={styles.content}>
        {/* PadMagnet Logo */}
        <View style={styles.logoRow}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.logoIcon}
            contentFit="contain"
          />
        </View>
        <Text style={styles.brandText}>
          <Text style={styles.brandPad}>Pad</Text>
          <Text style={styles.brandMagnet}>Magnet</Text>
        </Text>
        <Text style={styles.tagline}>
          Find Your Perfect Pad with PadScore{'\u2122'}
        </Text>

        {/* Role buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.renterButton, loadingRenter && { opacity: 0.7 }]}
            onPress={handleRenterRole}
            activeOpacity={0.85}
            disabled={loadingRenter || loadingOwner}
          >
            {loadingRenter ? (
              <ActivityIndicator size="small" color={COLORS.white} style={{ width: 36, height: 36, marginRight: 12 }} />
            ) : (
              <View style={styles.buttonIcon}>
                <Ionicons name="home" size={16} color={COLORS.white} />
              </View>
            )}
            <View style={styles.buttonTextWrap}>
              <Text style={styles.buttonTitle}>{loadingRenter ? 'Loading...' : 'Find a Rental'}</Text>
              <Text style={styles.buttonHint}>Swipe, match, and discover</Text>
            </View>
            {!loadingRenter && <Ionicons name="chevron-forward" size={18} color={COLORS.white} style={{ opacity: 0.5 }} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ownerButton, loadingOwner && { opacity: 0.7 }]}
            onPress={handleOwnerRole}
            activeOpacity={0.85}
            disabled={loadingRenter || loadingOwner}
          >
            {loadingOwner ? (
              <ActivityIndicator size="small" color={COLORS.text} style={{ width: 36, height: 36, marginRight: 12 }} />
            ) : (
              <View style={[styles.buttonIcon, styles.ownerIcon]}>
                <Ionicons name="key" size={16} color={COLORS.accent} />
              </View>
            )}
            <View style={styles.buttonTextWrap}>
              <Text style={[styles.buttonTitle, styles.ownerTitle]}>{loadingOwner ? 'Loading...' : 'List My Property'}</Text>
              <Text style={[styles.buttonHint, styles.ownerHint]}>Find qualified renters fast</Text>
            </View>
            {!loadingOwner && <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} style={{ opacity: 0.5 }} />}
          </TouchableOpacity>
        </View>

        {/* Sign in link */}
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/email')}
          style={styles.signInRow}
          activeOpacity={0.7}
          disabled={loadingRenter || loadingOwner}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        {/* Free badge */}
        <View style={styles.freeBadge}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
          <Text style={styles.freeText}>Free for renters. Always.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  imageSection: {
    height: height * 0.38,
    position: 'relative',
  },
  imageFade: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT.padding.lg,
    alignItems: 'center',
  },
  logoRow: {
    marginBottom: 6,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.radius.md,
  },
  brandText: {
    fontSize: 32,
    fontFamily: FONTS.heading.bold,
    marginBottom: 4,
  },
  brandPad: {
    color: COLORS.white,
  },
  brandMagnet: {
    color: COLORS.deepOrange,
  },
  tagline: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brandOrange,
    marginBottom: LAYOUT.padding.lg,
  },
  buttons: {
    width: '100%',
    gap: 12,
    marginBottom: LAYOUT.padding.md,
  },
  renterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ownerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownerIcon: {
    backgroundColor: COLORS.accent + '18',
  },
  buttonTextWrap: {
    flex: 1,
  },
  buttonTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  ownerTitle: {
    color: COLORS.text,
  },
  buttonHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  ownerHint: {
    color: COLORS.textSecondary,
  },
  signInRow: {
    marginBottom: LAYOUT.padding.sm,
  },
  signInText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  signInLink: {
    color: COLORS.accent,
    fontFamily: FONTS.body.semiBold,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  freeText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
