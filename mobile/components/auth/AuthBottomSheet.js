import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Auth Bottom Sheet — single modal for ALL authentication.
 * Replaces 4 separate auth screens (email, password, register, forgot-password).
 *
 * Priority order (per reference_auth_ux_language.md):
 * 1. Continue with Google
 * 2. Continue with Apple (iOS only)
 * 3. Use Face ID / Fingerprint (future — requires expo-local-authentication)
 * 4. Send Magic Link
 * 5. Email + Password (hidden behind "More options")
 *
 * Context-specific copy passed via props.
 */

export default function AuthBottomSheet({ visible, onClose, context, padpoints }) {
  const [mode, setMode] = useState('main'); // 'main' | 'magic' | 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [magicSent, setMagicSent] = useState(false);

  const contextCopy = getContextCopy(context, padpoints);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'padmagnet://auth-callback' },
      });
      if (authError) setError(authError.message);
      else onClose?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleFacebook() {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: 'padmagnet://auth-callback' },
      });
      if (authError) setError(authError.message);
      else onClose?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleApple() {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: 'padmagnet://auth-callback' },
      });
      if (authError) setError(authError.message);
      else onClose?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email'); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: 'padmagnet://auth-callback' },
      });
      if (authError) setError(authError.message);
      else {
        setMagicSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handlePassword() {
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true);
    setError(null);
    try {
      // Try sign in first, fall back to sign up
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          // Try sign up
          const { error: signUpError } = await supabase.auth.signUp({
            email, password,
            options: { emailRedirectTo: 'padmagnet://auth-callback' },
          });
          if (signUpError) setError(signUpError.message);
          else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose?.();
          }
        } else {
          setError(signInError.message);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose?.();
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function resetState() {
    setMode('main');
    setEmail('');
    setPassword('');
    setError(null);
    setMagicSent(false);
    setLoading(false);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => { resetState(); onClose?.(); }}
    >
      <Pressable style={styles.backdrop} onPress={() => { resetState(); onClose?.(); }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <Pressable style={styles.sheetOuter} onPress={e => e.stopPropagation()}>
            {/* Manila folder tab — narrower, centered, protruding */}
            <View style={styles.folderTabOuter}>
              <View style={styles.folderTab}>
                <Text style={styles.tabTitle}>{contextCopy.title}</Text>
                <View style={styles.tabHandle} />
              </View>
            </View>

            {/* Folder body — full width, same manila color family */}
            <LinearGradient
              colors={['#C9A96A', '#D4B87A', '#CCAA6E', '#B89858', '#8B7035']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.folderBody}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.sheet}>
              <Text style={styles.subtitle}>{contextCopy.subtitle}</Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {mode === 'main' && !magicSent && (
              <>
                {/* Google — white bg, red G, dark text (matches owner auth screen) */}
                <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} disabled={loading} activeOpacity={0.8}>
                  <Ionicons name="logo-google" size={18} color={COLORS.socialGoogle} />
                  <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Facebook — blue bg, white f icon, white text */}
                <TouchableOpacity style={styles.facebookButton} onPress={handleFacebook} disabled={loading} activeOpacity={0.8}>
                  <Ionicons name="logo-facebook" size={18} color={COLORS.white} />
                  <Text style={styles.facebookText}>Continue with Facebook</Text>
                </TouchableOpacity>

                {/* Apple (iOS only) */}
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.appleButton} onPress={handleApple} disabled={loading} activeOpacity={0.8}>
                    <Ionicons name="logo-apple" size={18} color={COLORS.white} />
                    <Text style={styles.appleText}>Continue with Apple</Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Magic Link */}
                <TouchableOpacity style={styles.magicButton} onPress={() => setMode('magic')} activeOpacity={0.8}>
                  <Ionicons name="mail" size={18} color={COLORS.accent} />
                  <Text style={styles.magicText}>Send Magic Link</Text>
                </TouchableOpacity>

                {/* More options */}
                <TouchableOpacity style={styles.moreButton} onPress={() => setMode('password')} activeOpacity={0.8}>
                  <Text style={styles.moreText}>More options</Text>
                </TouchableOpacity>
              </>
            )}

            {mode === 'magic' && !magicSent && (
              <>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Your email address"
                  placeholderTextColor={COLORS.slate}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleMagicLink} disabled={loading} activeOpacity={0.8}>
                  {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Send Magic Link</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('main')} style={styles.backLink}>
                  <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
              </>
            )}

            {magicSent && (
              <View style={styles.sentBox}>
                <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
                <Text style={styles.sentTitle}>Check your email</Text>
                <Text style={styles.sentText}>We sent a sign-in link to {email}. Tap it to continue.</Text>
              </View>
            )}

            {mode === 'password' && (
              <>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={COLORS.slate}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={COLORS.slate}
                  secureTextEntry
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handlePassword} disabled={loading} activeOpacity={0.8}>
                  {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Sign In / Sign Up</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('main')} style={styles.backLink}>
                  <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Transfer message */}
            {padpoints > 0 && (
              <Text style={styles.transferText}>
                Your {padpoints} PadPoints & saved homes transfer automatically.
              </Text>
            )}

            {/* Skip (non-blocking contexts only) */}
            {contextCopy.dismissible && (
              <TouchableOpacity onPress={() => { resetState(); onClose?.(); }} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            )}
              </View>
            </LinearGradient>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/**
 * Context-specific copy — changes wording based on what triggered the auth sheet.
 * See reference_auth_ux_language.md for the full spec.
 */
function getContextCopy(context, padpoints) {
  switch (context) {
    case 'message':
      return {
        title: '📩 Message this owner',
        subtitle: `Sign in to send messages${padpoints > 0 ? ` and keep your ${padpoints} PadPoints` : ''}.`,
        dismissible: false,
      };
    case 'messages_tab':
      return {
        title: '💬 Your Messages',
        subtitle: 'Sign in to View & Send SMS/Email to Property Owners.',
        dismissible: false,
      };
    case 'save_limit':
      return {
        title: '🔒 Save your PadPoints',
        subtitle: `You've earned ${padpoints} PadPoints and saved homes! Sign in to keep them forever.`,
        dismissible: true,
      };
    case 'notifications':
      return {
        title: '🔔 Enable Notifications',
        subtitle: 'Sign in to set up push and SMS notifications.',
        dismissible: false,
      };
    case 'returning':
      return {
        title: '👋 Welcome back!',
        subtitle: `Sign in to access your ${padpoints} PadPoints and saved homes.`,
        dismissible: true,
      };
    default:
      return {
        title: '🔓 Sign in to PadMagnet',
        subtitle: padpoints > 0 ? `Keep your ${padpoints} PadPoints and unlock full features.` : 'Unlock messaging, notifications, and more.',
        dismissible: true,
      };
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.scrimDark,
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheetOuter: {
    marginHorizontal: 7,
    alignItems: 'center',
  },
  folderTabOuter: {
    zIndex: 1,
    marginBottom: -1,
    // Shadow for lifted tab
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  folderTab: {
    backgroundColor: '#C9A96A',
    borderTopLeftRadius: LAYOUT.radius.xl,
    borderTopRightRadius: LAYOUT.radius.xl,
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#8B7035',
  },
  tabTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: '#3A2810',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  tabHandle: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6B5020',
    alignSelf: 'center',
    marginTop: 6,
    opacity: 0.6,
  },
  folderBody: {
    width: '100%',
    borderTopLeftRadius: LAYOUT.radius.xl,
    borderTopRightRadius: LAYOUT.radius.xl,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#8B7035',
    overflow: 'hidden',
  },
  sheet: {
    paddingHorizontal: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding['2xl'],
    paddingTop: LAYOUT.padding.lg,
    width: '100%',
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#4A3520',
    textAlign: 'center',
    marginBottom: LAYOUT.padding.lg,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: COLORS.danger + '22',
    borderRadius: LAYOUT.radius.sm,
    padding: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.md,
  },
  errorText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.md,
    padding: 13,
    marginBottom: 8,
  },
  googleText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.socialTextDark,
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.socialFacebook,
    borderRadius: LAYOUT.radius.md,
    padding: 13,
    marginBottom: 8,
  },
  facebookText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.black,
    borderRadius: LAYOUT.radius.md,
    padding: 13,
    marginBottom: 8,
  },
  appleText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: LAYOUT.padding.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#A08040',
  },
  dividerText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: '#6B5020',
  },
  magicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: LAYOUT.radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#8B7035',
  },
  magicText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: '#2A5DB0',
  },
  moreButton: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.sm,
  },
  moreText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: '#6B5020',
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: LAYOUT.radius.sm,
    padding: 14,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: '#3A2810',
    borderWidth: 1,
    borderColor: '#A08040',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.md,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.sm,
  },
  backText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: '#2A5DB0',
  },
  sentBox: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.lg,
    gap: 8,
  },
  sentTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
  },
  sentText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  transferText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: '#2D6B30',
    textAlign: 'center',
    marginTop: LAYOUT.padding.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.md,
  },
  skipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: '#6B5020',
  },
});
