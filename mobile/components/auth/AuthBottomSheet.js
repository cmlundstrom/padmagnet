import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Pressable, ActivityIndicator, Platform, Keyboard, Dimensions, ScrollView, BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DragHandle from '../ui/DragHandle';
import ManilaCard from '../ui/ManilaCard';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle, signInWithFacebook, signInWithApple, signInWithMagicLink, signIn, signUp } from '../../lib/auth';
import { subscribeMagicLinkRelay } from '../../hooks/useMagicLinkRelay';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 120;

export default function AuthBottomSheet({ visible, onClose, context, padpoints }) {
  const alert = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [showMagicPrompt, setShowMagicPrompt] = useState(false);
  const [loading, setLoading] = useState(null);
  const [magicSent, setMagicSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Cross-device magic link relay cleanup
  const relayCleanup = useRef(null);

  useEffect(() => {
    return () => relayCleanup.current?.();
  }, []);

  // Keyboard-aware lift for the main sheet
  const keyboardOffset = useSharedValue(0);
  // Keyboard-aware lift for the magic link prompt card
  const promptLiftY = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    // Resolve the keyboard height reliably. On Android with adjustResize
    // (default for Expo), keyboardDidShow's endCoordinates.height sometimes
    // reports 0 because the window was already resized before the event
    // fires. Fall back to the screen/window dimensions diff, which is a
    // rock-solid way to detect the visible keyboard area.
    const resolveKeyboardHeight = (evt) => {
      const reported = evt?.endCoordinates?.height || 0;
      if (reported > 0) return reported;
      const screenH = Dimensions.get('screen').height;
      const windowH = Dimensions.get('window').height;
      const diff = Math.max(0, screenH - windowH);
      // Conservative fallback for devices where both reads fail
      return diff > 0 ? diff : 320;
    };

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const rawKb = resolveKeyboardHeight(e);
      // Sheet: lift to keyboard edge with a 45px peek breathing gap
      keyboardOffset.value = withTiming(-(rawKb - 45), { duration: 250 });
      // Prompt card: natural position is screen-center (justifyContent:center
      // on its overlay). Shift upward by half the keyboard height minus a
      // 35px nudge-down so the prompt sits slightly below the pure-center
      // of the visible area — reads better with the "Send Link" button
      // falling closer to the eye line instead of the prompt header.
      promptLiftY.value = withTiming(-(rawKb / 2 - 35), { duration: 250 });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardOffset.value = withTiming(0, { duration: 200 });
      promptLiftY.value = withTiming(0, { duration: 200 });
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const promptLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: promptLiftY.value }],
  }));

  // Entrance + swipe-to-dismiss
  const enterY = useSharedValue(SCREEN_HEIGHT);
  const swipeY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Android back button handler (replaces Modal's onRequestClose)
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      resetAndClose();
      return true;
    });
    return () => handler.remove();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // Start off-screen, ease in with a gentle spring
      enterY.value = SCREEN_HEIGHT;
      swipeY.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 350 });
      enterY.value = withSpring(0, { damping: 22, stiffness: 85, mass: 1 });
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      swipeY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        swipeY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
          runOnJS(resetAndClose)();
        });
        backdropOpacity.value = withTiming(0, { duration: 250 });
      } else {
        swipeY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardOffset.value + enterY.value + swipeY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contextCopy = getContextCopy(context, padpoints);

  async function handleGoogle() {
    setLoading('google');
    try {
      await signInWithGoogle();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetState();
      onClose?.();
    } catch (err) {
      if (!err.message?.includes('cancelled')) alert('Sign In Failed', err.message);
    }
    setLoading(null);
  }

  async function handleFacebook() {
    setLoading('facebook');
    try {
      await signInWithFacebook();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetState();
      onClose?.();
    } catch (err) {
      if (!err.message?.includes('cancelled')) alert('Sign In Failed', err.message);
    }
    setLoading(null);
  }

  async function handleApple() {
    setLoading('apple');
    try {
      await signInWithApple();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetState();
      onClose?.();
    } catch (err) {
      if (!err.message?.includes('cancelled')) alert('Sign In Failed', err.message);
    }
    setLoading(null);
  }

  function openMagicPrompt() {
    setMagicEmail(email || '');
    setShowMagicPrompt(true);
  }

  function getReturnPath() {
    switch (context) {
      case 'create_listing': return '/(owner)/listings';
      case 'owner_messages': return '/(owner)/messages';
      case 'owner_profile': return '/(owner)/profile';
      case 'owner_upgrade': return '/(owner)/profile';
      case 'tenant_profile': return '/(tenant)/profile';
      case 'profile_email_change': return '/settings/change-email';
      case 'messages_tab': return '/(tenant)/messages';
      case 'message': return '/(tenant)/swipe';
      default: return null;
    }
  }

  async function sendMagicLink() {
    if (!magicEmail) return;
    setLoading('magic');
    try {
      // Generate nonce for cross-device relay (desktop email → mobile app)
      const nonce = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

      // Derive role intent from the current AuthBottomSheet context. Passed
      // into signInWithMagicLink so it lands in user_metadata.role and the
      // handle_new_user trigger sets profiles.role + roles correctly on signup.
      // Owner-intent contexts imply the user wants to act as an owner.
      const OWNER_INTENT_CONTEXTS = ['create_listing', 'owner_messages', 'owner_profile', 'owner_upgrade'];
      // profile_email_change preserves whatever role the user is currently in,
      // so it doesn't force a roleIntent — leave undefined so the trigger
      // doesn't overwrite their existing role/roles.
      const roleIntent = context === 'profile_email_change'
        ? undefined
        : (OWNER_INTENT_CONTEXTS.includes(context) ? 'owner' : 'tenant');

      await signInWithMagicLink(magicEmail, nonce, roleIntent);

      // Email sent successfully — transition UI immediately
      setEmail(magicEmail);
      setShowMagicPrompt(false);
      setMagicSent(true);
      setLoading(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // These are fire-and-forget — don't let them block the UI
      AsyncStorage.setItem('magic_link_nonce', nonce).catch(() => {});
      const returnTo = getReturnPath();
      if (returnTo) AsyncStorage.setItem('auth_return_to', returnTo).catch(() => {});

      // Start listening for cross-device token relay
      relayCleanup.current?.();
      relayCleanup.current = subscribeMagicLinkRelay(nonce, (dest) => {
        resetState();
        onClose?.();
        router.replace(dest);
      });
      return;
    } catch (err) {
      alert("Couldn't Send Link", err.message);
    }
    setLoading(null);
  }

  async function handlePassword() {
    if (!email || !password) { alert('Missing Information', 'Please enter your email and password.'); return; }
    setLoading('password');
    try {
      try {
        await signIn(email, password);
      } catch (signInErr) {
        if (signInErr.message?.includes('Invalid login')) {
          await signUp(email, password);
        } else {
          throw signInErr;
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetState();
      onClose?.();
    } catch (err) {
      alert('Sign In Failed', err.message);
    }
    setLoading(null);
  }

  function resetState() {
    setEmail('');
    setPassword('');
    setMagicEmail('');
    setShowMagicPrompt(false);
    setShowPassword(false);
    setMagicSent(false);
    setLoading(null);
    relayCleanup.current?.();
    relayCleanup.current = null;
  }

  function resetAndClose() {
    resetState();
    onClose?.();
  }

  if (!visible) return null;

  return (
    <View style={styles.absoluteOverlay}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={resetAndClose}>
        <Animated.View style={[styles.sheetWrapper, sheetStyle]}>
          <Pressable style={styles.sheetOuter} onPress={e => e.stopPropagation()}>
            <GestureDetector gesture={panGesture}>
              <View>
                <ManilaCard label={contextCopy.tabLabel || 'Sign In'} tabAlign="right">
                  <ScrollView
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.subtitle}>{contextCopy.subtitle}</Text>

                {!magicSent ? (
                  <>
                    {/* ── Social buttons ──────────────── */}
                    <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} disabled={!!loading} activeOpacity={0.8}>
                      {loading === 'google' ? <ActivityIndicator color={COLORS.socialGoogle} size="small" /> : <Ionicons name="logo-google" size={18} color={COLORS.socialGoogle} />}
                      <Text style={styles.googleText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.facebookButton} onPress={handleFacebook} disabled={!!loading} activeOpacity={0.8}>
                      {loading === 'facebook' ? <ActivityIndicator color={COLORS.white} size="small" /> : <Ionicons name="logo-facebook" size={18} color={COLORS.white} />}
                      <Text style={styles.facebookText}>Continue with Facebook</Text>
                    </TouchableOpacity>

                    {Platform.OS === 'ios' && (
                      <TouchableOpacity style={styles.appleButton} onPress={handleApple} disabled={!!loading} activeOpacity={0.8}>
                        {loading === 'apple' ? <ActivityIndicator color={COLORS.white} size="small" /> : <Ionicons name="logo-apple" size={18} color={COLORS.white} />}
                        <Text style={styles.appleText}>Continue with Apple</Text>
                      </TouchableOpacity>
                    )}

                    {/* ── Divider ─────────────────────── */}
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or sign in with email</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    {/* ── Email + Password fields ─────── */}
                    <TextInput
                      testID="auth-sheet-email-input"
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email address"
                      placeholderTextColor={COLORS.slate}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <View style={styles.passwordWrap}>
                      <TextInput
                        testID="auth-sheet-password-input"
                        style={styles.passwordInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password (or Magic Link)"
                        placeholderTextColor={COLORS.slate}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        testID="auth-sheet-eye-toggle"
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeToggle}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color="#6B5020"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* ── Dual action buttons ────────── */}
                    <View style={styles.dualButtons}>
                      <TouchableOpacity
                        testID="auth-sheet-sign-in-cta"
                        style={styles.passwordButton}
                        onPress={handlePassword}
                        disabled={!!loading}
                        activeOpacity={0.8}
                      >
                        {loading === 'password' ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <>
                            <Ionicons name="key" size={14} color={COLORS.white} />
                            <Text style={styles.passwordText}>Sign In</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <Text style={styles.dualOr}>Or</Text>

                      <TouchableOpacity
                        style={styles.magicButton}
                        onPress={openMagicPrompt}
                        disabled={!!loading}
                        activeOpacity={0.8}
                      >
                        {loading === 'magic' ? (
                          <ActivityIndicator color={COLORS.accent} size="small" />
                        ) : (
                          <>
                            <Ionicons name="mail" size={14} color={COLORS.accent} />
                            <Text style={styles.magicText}>Magic Link</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.sentBox}>
                    <Ionicons name="checkmark-circle" size={44} color={COLORS.success} />
                    <Text style={styles.sentTitle}>Check your email</Text>
                    <Text style={styles.sentText}>
                      We sent a sign-in link to {email}. Tap it to continue.
                    </Text>
                    <TouchableOpacity onPress={() => setMagicSent(false)} style={styles.resendLink}>
                      <Text style={styles.resendText}>Resend link</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Transfer message */}
                {padpoints > 0 && (
                  <Text style={styles.transferText}>
                    Your {padpoints} PadPoints & saved homes transfer automatically.
                  </Text>
                )}

                {/* Skip */}
                {contextCopy.dismissible && (
                  <TouchableOpacity onPress={resetAndClose} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip for now</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
                </ManilaCard>
              </View>
            </GestureDetector>
          </Pressable>
        </Animated.View>
      </Pressable>
      </Animated.View>

      {/* ── Magic Link email prompt ──────────────── */}
      {showMagicPrompt && (
        <View style={styles.promptOverlay}>
        <Pressable style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: LAYOUT.padding.lg }} onPress={() => setShowMagicPrompt(false)}>
          <Animated.View style={[styles.promptCard, promptLiftStyle]} onStartShouldSetResponder={() => true}>
            <Ionicons name="mail" size={28} color={COLORS.accent} style={{ marginBottom: 8 }} />
            <Text style={styles.promptTitle}>Send Magic Link</Text>
            <Text style={styles.promptSubtitle}>We'll email you a sign-in link — no password needed.</Text>
            <TextInput
              style={styles.promptInput}
              value={magicEmail}
              onChangeText={setMagicEmail}
              placeholder="Your email address"
              placeholderTextColor={COLORS.slate}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.promptButtons}>
              <TouchableOpacity style={styles.promptCancel} onPress={() => setShowMagicPrompt(false)} activeOpacity={0.7}>
                <Text style={styles.promptCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.promptSend} onPress={sendMagicLink} disabled={loading === 'magic'} activeOpacity={0.8}>
                {loading === 'magic' ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.promptSendText}>Send Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
        </View>
      )}

    </View>
  );
}

/**
 * Context-specific copy — changes wording based on what triggered the auth sheet.
 */
function getContextCopy(context, padpoints) {
  switch (context) {
    case 'message':
      return {
        tabLabel: 'Message',
        title: '\u{1F4E9} Message this owner',
        subtitle: `Sign in to send messages${padpoints > 0 ? ` and keep your ${padpoints} PadPoints` : ''}.`,
        dismissible: false,
      };
    case 'messages_tab':
      return {
        tabLabel: 'Messages',
        title: '\u{1F4AC} Your Messages',
        subtitle: 'Sign in to View & Send SMS/Email to Property Owners.',
        dismissible: false,
      };
    case 'save_limit':
      return {
        tabLabel: 'Save Points',
        title: '\u{1F512} Save your PadPoints',
        subtitle: `You've earned ${padpoints} PadPoints and saved homes! Sign in to keep them forever.`,
        dismissible: true,
      };
    case 'notifications':
      return {
        tabLabel: 'Notifications',
        title: '\u{1F514} Enable Notifications',
        subtitle: 'Sign in to set up push and SMS notifications.',
        dismissible: false,
      };
    case 'returning':
      return {
        tabLabel: 'Welcome Back',
        title: '\u{1F44B} Welcome back!',
        subtitle: `Sign in to access your ${padpoints} PadPoints and saved homes.`,
        dismissible: true,
      };
    case 'create_listing':
      return {
        tabLabel: 'List Property',
        title: '\u{1F3E0} List Your Property',
        subtitle: 'Sign in to create your free rental listing and reach qualified renters.',
        dismissible: false,
      };
    case 'owner_messages':
      return {
        tabLabel: 'Messages',
        title: '\u{1F4AC} Your Messages',
        subtitle: 'Sign in to view and respond to renter inquiries.',
        dismissible: false,
      };
    case 'owner_profile':
      return {
        tabLabel: 'Account',
        title: '\u{1F464} Your Account',
        subtitle: 'Sign in to manage listings, connect with renters, and track your rental performance.',
        dismissible: true,
      };
    case 'owner_upgrade':
      return {
        tabLabel: 'Upgrade',
        title: '\u{2B06}\u{FE0F} Upgrade Your Plan',
        subtitle: 'Sign in to access premium features, analytics, and more listing slots.',
        dismissible: false,
      };
    case 'tenant_profile':
      return {
        tabLabel: 'Account',
        title: '\u{1F464} Your Account',
        subtitle: 'Sign in to save matches, message owners, and personalize your search.',
        dismissible: true,
      };
    case 'profile_email_change':
      return {
        tabLabel: 'Re-Auth',
        title: '\u{1F510} Confirm Your Identity',
        subtitle: 'For your security, sign in again before changing your email.',
        dismissible: true,
      };
    default:
      return {
        tabLabel: 'Sign In',
        title: '\u{1F513} Sign in to PadMagnet',
        subtitle: padpoints > 0 ? `Keep your ${padpoints} PadPoints and unlock full features.` : 'Unlock messaging, notifications, and more.',
        dismissible: true,
      };
  }
}

const styles = StyleSheet.create({
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.scrimDark,
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheetOuter: {
    alignItems: 'center',
  },

  // ── Right-side tab with label sticker ─────────────
  tabWrapper: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: -1,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  tab: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
  },
  labelSticker: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  labelText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: '#3A2810',
    letterSpacing: 0.5,
  },
  dragHandle: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6B5020',
    opacity: 0.5,
  },

  // ── Folder body ───────────────────────────────────
  folderBody: {
    width: '100%',
    borderTopLeftRadius: LAYOUT.radius.xl,
    borderTopRightRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 14,
  },
  bodyContent: {
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: 4,
    paddingBottom: LAYOUT.padding.md,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: '#4A3520',
    textAlign: 'center',
    marginBottom: LAYOUT.padding.lg,
    lineHeight: 22,
  },

  // ── Social buttons ────────────────────────────────
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: LAYOUT.radius.md,
    padding: 14,
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
    padding: 14,
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
    padding: 14,
    marginBottom: 8,
  },
  appleText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },

  // ── Divider ───────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: LAYOUT.padding.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#A08040',
  },
  dividerText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#6B5020',
  },

  // ── Inputs ────────────────────────────────────────
  input: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: LAYOUT.radius.sm,
    padding: 12,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: '#3A2810',
    borderWidth: 1,
    borderColor: '#A08040',
    marginBottom: 8,
  },

  // ── Password field with eyeball ────────────────────
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 1,
    borderColor: '#A08040',
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: '#3A2810',
  },
  eyeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // ── Dual action buttons ───────────────────────────
  dualButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dualOr: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#6B5020',
  },
  magicButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#8B7035',
    shadowColor: '#6B5020',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  magicText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.sm,
    color: '#5A4420',
  },
  passwordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 11,
  },
  passwordText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },

  // ── Magic link sent ───────────────────────────────
  sentBox: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.lg,
    gap: 8,
  },
  sentTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: '#3A2810',
  },
  sentText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#4A3520',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: LAYOUT.padding.md,
  },
  resendLink: {
    paddingVertical: LAYOUT.padding.sm,
  },
  resendText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: '#2A5DB0',
    textDecorationLine: 'underline',
  },

  // ── Transfer / Skip ───────────────────────────────
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

  // ── Magic link prompt ─────────────────────────────
  promptOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: COLORS.scrimDarker,
  },
  promptCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  promptTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 4,
  },
  promptSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: LAYOUT.padding.md,
  },
  promptInput: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.sm,
    padding: 14,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: LAYOUT.padding.md,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  promptCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: LAYOUT.radius.md,
    backgroundColor: COLORS.frostedGlass,
  },
  promptCancelText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  promptSend: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: LAYOUT.radius.md,
    backgroundColor: COLORS.accent,
  },
  promptSendText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
});
