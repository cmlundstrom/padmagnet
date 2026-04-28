import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Pressable, ActivityIndicator, Platform, Keyboard, Dimensions, ScrollView, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DragHandle from '../ui/DragHandle';
import ManilaCard from '../ui/ManilaCard';
import UnlockAccountModal from './UnlockAccountModal';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle, signInWithFacebook, signInWithApple, signInWithMagicLink, signIn, signUp } from '../../lib/auth';
import { resolvePostLoginDestination } from '../../lib/routing';
import { subscribeMagicLinkRelay } from '../../hooks/useMagicLinkRelay';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 120;

// Owner-context contexts. Drives roleIntent for both magic-link and
// password-signup paths so the handle_new_user trigger sets the right
// role on profile creation. profile_email_change preserves whatever
// role the user already has — leave roleIntent undefined.
const OWNER_INTENT_CONTEXTS = ['create_listing', 'owner_messages', 'owner_profile', 'owner_upgrade'];

function deriveRoleIntent(context) {
  if (context === 'profile_email_change') return undefined;
  return OWNER_INTENT_CONTEXTS.includes(context) ? 'owner' : 'tenant';
}

// UUID-v4 nonce generator. Used by both the magic-link and password-signup
// flows to identify their entry in the magic_link_relay table so the
// running app can pick up tokens via Supabase Realtime when the user
// taps the email link.
function generateRelayNonce() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function AuthBottomSheet({ visible, onClose, context, padpoints, ownerHasListings = false }) {
  const alert = useAlert();
  // Bottom inset clears the Android system nav bar (gesture or 3-button)
  // so the dual-CTA row doesn't get hidden under it. Without this, the
  // "MESSAGE" L1 surface (and any other context that produces a tall
  // sheet) bleeds the Continue/Magic Link row below the nav bar and the
  // user can't tap them. Found 2026-04-27 on S10 listing-detail L1.
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [showMagicPrompt, setShowMagicPrompt] = useState(false);
  const [loading, setLoading] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  // Single state replaces the prior magicSent boolean. Drives the sentBox
  // panel's copy + Resend behavior so password-signup confirmations and
  // magic-link sends share the same waiting UI without colliding.
  //   null     → form mode (default)
  //   'magic'  → magic link sent, waiting for tap
  //   'signup' → password signup confirmation sent, waiting for tap
  const [pendingState, setPendingState] = useState(null);
  // Nonce we used for the current pending email — needed for the Resend
  // button so we can re-fire the relay subscription. Set alongside
  // pendingState whenever we transition into the sentBox panel.
  const [pendingNonce, setPendingNonce] = useState(null);
  // JIT signup modal — replaces the prior system "Couldn't sign you in"
  // alert with a brand-art modal. Shown when L1 signin fails Invalid
  // login (account doesn't exist OR wrong password). User taps "Create
  // new account" → runSignUp; or "Try again" → dismiss.
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Cross-device magic link relay cleanup
  const relayCleanup = useRef(null);

  useEffect(() => {
    return () => relayCleanup.current?.();
  }, []);

  // Keyboard lift — inline listeners are the known-good pattern for this
  // component. The two-lift structure (sheet body + magic-link prompt)
  // needed separate shared values, and calling the shared hook twice was
  // regressing the sheet lift in production. Other components (e.g.
  // PriceEditModal) use the single-call hook fine.
  // Rule A (sheet): translateY = -(kbH - 45). Rule B (popup): -(kbH/2 - 35).
  // Memory: feedback_keyboard_lift_modal.md.
  const keyboardOffset = useSharedValue(0);
  const promptLiftY = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const resolveKeyboardHeight = (evt) => {
      const reported = evt?.endCoordinates?.height || 0;
      if (reported > 0) return reported;
      const diff = Dimensions.get('screen').height - Dimensions.get('window').height;
      return diff > 0 ? diff : 320;
    };

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const kb = resolveKeyboardHeight(e);
      keyboardOffset.value = withTiming(-(kb - 45), { duration: 250 });
      promptLiftY.value = withTiming(-(kb / 2 - 35), { duration: 250 });
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
      await routeAfterSignIn();
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
      await routeAfterSignIn();
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
      await routeAfterSignIn();
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
      // Owner auths from the L1 "Create or Edit Your Listing" CTA. Route to
      // existing listings for returning owners; send first-time owners
      // straight into the Studio so they can list their property in one
      // less tap. Decision made 2026-04-21 after removing the duplicate
      // auto-nav that used to live in (owner)/home.js.
      case 'create_listing': return ownerHasListings ? '/(owner)/listings' : '/owner/create';
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

  // Shared post-signin nav. Only navigates when the resolver returns a
  // firstTime Edit Profile interposition path. For normal sign-ins
  // (display_name already set) we no-op so the user stays on the
  // L1 surface that triggered the sheet — important for contexts like
  // "message" where the user is on a specific listing detail and needs
  // to remain there to continue with their message intent. The prior
  // unconditional router.replace yanked them to getReturnPath() and
  // broke the "stay where you were" UX (caught by the anon_upgrade
  // smoke 2026-04-27). Magic-link / cross-device cases still navigate
  // correctly via auth-callback.js + useMagicLinkRelay.js, which call
  // resolvePostLoginDestination + router.replace unconditionally — they
  // need to because the user is no longer on the L1 surface.
  async function routeAfterSignIn() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const dest = await resolvePostLoginDestination(session, undefined, getReturnPath());
      if (dest && dest.startsWith('/settings/edit-profile')) {
        router.replace(dest);
      }
    } catch (err) {
      console.warn('[AuthBottomSheet] routeAfterSignIn failed:', err.message);
    }
  }

  async function sendMagicLink() {
    if (!magicEmail) return;
    setLoading('magic');
    try {
      const nonce = generateRelayNonce();
      const roleIntent = deriveRoleIntent(context);

      await signInWithMagicLink(magicEmail, nonce, roleIntent);

      // Email sent successfully — transition UI immediately
      setEmail(magicEmail);
      setShowMagicPrompt(false);
      setPendingNonce(nonce);
      setPendingState('magic');
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

  // Implicit signin-first + JIT signup CTA. The L1 sheet has a single
  // primary "Continue" button; we always try signIn first because most
  // users hitting L1 from a new device want to sign back in. Three
  // failure paths:
  //   - Invalid login           → two-button alert: Try again | Create new account
  //   - Email not confirmed     → call supabase.auth.resend(), surface honestly
  //   - Anything else           → show the raw error
  //
  // The toggle UX is gone. The JIT signup path is gated by an explicit
  // user tap inside the failure alert, so we never silent-create an
  // account behind the user's back.
  async function handlePassword() {
    if (!email || !password) {
      alert('Missing Information', 'Please enter your email and password.');
      return;
    }
    setLoading('password');
    try {
      try {
        await signIn(email, password);
      } catch (signInErr) {
        const msg = signInErr.message || '';

        if (msg.toLowerCase().includes('email not confirmed')) {
          // Account exists but the user never tapped the original
          // confirmation email. Resend it for real this time and tell
          // the user honestly that we just sent one (the prior copy
          // claimed a send without actually doing it).
          try {
            await supabase.auth.resend({ type: 'signup', email });
          } catch (resendErr) {
            console.warn('[AuthBottomSheet] Resend confirm failed:', resendErr.message);
          }
          alert(
            'Almost there',
            `We just resent your confirmation link to ${email}. Tap it to verify your email, then come back to sign in.`
          );
          setLoading(null);
          return;
        }

        if (!msg.includes('Invalid login')) {
          alert('Sign In Failed', msg);
          setLoading(null);
          return;
        }

        // Invalid login → open the UnlockAccountModal (custom brand art
        // replaced the prior system alert 2026-04-27). Modal exposes:
        //   - "Create new account" (primary, gradient + magnet icon) →
        //     runSignUp on tap
        //   - "Try again" (discrete underlined link) → dismiss, parent
        //     re-shows the form
        // The two-button form prevents silent signup because account
        // creation requires an explicit opt-in tap.
        setLoading(null);
        setShowUnlockModal(true);
        return;
      }

      // signIn succeeded — route through the resolver (firstTime Edit
      // Profile interposition fires here for renters with no name).
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetState();
      onClose?.();
      await routeAfterSignIn();
      setLoading(null);
    } catch (err) {
      alert('Something went wrong', err.message);
      setLoading(null);
    }
  }

  // JIT signup, fired from the "Create new account" button in the
  // UnlockAccountModal. Mirrors sendMagicLink's relay machinery so the
  // confirmation email link round-trips back to the running app via
  // Supabase Realtime instead of dead-ending on a web page.
  async function runSignUp() {
    setLoading('password');
    const nonce = generateRelayNonce();
    const roleIntent = deriveRoleIntent(context);
    const metadata = roleIntent ? { role: roleIntent } : {};

    let signUpResult;
    try {
      signUpResult = await signUp(email, password, metadata, nonce);
    } catch (signUpErr) {
      setShowUnlockModal(false);
      alert("Couldn't create account", signUpErr.message);
      setLoading(null);
      return;
    }

    // Supabase email-enumeration protection: when the email already
    // exists, signUp returns no error AND no session AND empty
    // identities. Detect that and tell the user honestly that the
    // account already exists — don't pretend to send an email.
    const identitiesLen = signUpResult?.user?.identities?.length ?? 0;
    if (!signUpResult?.session && identitiesLen === 0) {
      setShowUnlockModal(false);
      alert(
        'Account exists',
        `That email is already registered, but the password didn’t match. Try a different password, or use Magic Link to sign in without one.`
      );
      setLoading(null);
      return;
    }

    // Auto-confirm enabled (rare, dev-only) — same success path as signIn.
    if (signUpResult?.session) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowUnlockModal(false);
      resetState();
      onClose?.();
      await routeAfterSignIn();
      setLoading(null);
      return;
    }

    // Real new-user pending confirmation. Stash the nonce + return-path
    // and subscribe to the relay channel so the user's email-link tap
    // delivers tokens to the running app. Keep the sheet mounted in the
    // sentBox panel — closing it would kill the subscription.
    AsyncStorage.setItem('pending_signup_nonce', nonce).catch(() => {});
    const returnTo = getReturnPath();
    if (returnTo) AsyncStorage.setItem('auth_return_to', returnTo).catch(() => {});

    relayCleanup.current?.();
    relayCleanup.current = subscribeMagicLinkRelay(nonce, (dest) => {
      resetState();
      onClose?.();
      router.replace(dest);
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowUnlockModal(false);
    setPendingNonce(nonce);
    setPendingState('signup');
    setLoading(null);
  }

  // Re-send the email for whichever pending flow is active. Magic-link
  // goes through signInWithMagicLink (re-creates the relay nonce server-
  // side); password-signup goes through supabase.auth.resend with the
  // existing nonce so the link still routes back to the same channel.
  async function handleResend() {
    if (!email && !magicEmail) return;
    setLoading('resend');
    try {
      if (pendingState === 'magic') {
        // Magic-link resend uses the same nonce so the existing relay
        // subscription stays valid for the new email.
        const roleIntent = deriveRoleIntent(context);
        await signInWithMagicLink(magicEmail || email, pendingNonce, roleIntent);
      } else if (pendingState === 'signup') {
        // Password-signup resend doesn't generate a new token — Supabase's
        // resend re-sends the existing confirmation. The relay nonce
        // baked into the original emailRedirectTo URL stays valid.
        await supabase.auth.resend({ type: 'signup', email });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      alert("Couldn't resend", err.message);
    }
    setLoading(null);
  }

  function resetState() {
    setEmail('');
    setPassword('');
    setMagicEmail('');
    setShowMagicPrompt(false);
    setShowPassword(false);
    setPendingState(null);
    setPendingNonce(null);
    setShowUnlockModal(false);
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
                contentContainerStyle={[
                  styles.bodyContent,
                  // Top up the body's bottom padding by the system safe-area
                  // so the dual-button row clears the Android nav bar
                  // (gesture or 3-button). LAYOUT.padding.md is the
                  // default bodyContent.paddingBottom; +12 keeps a
                  // comfortable gap above the nav bar.
                  { paddingBottom: LAYOUT.padding.md + insets.bottom + 12 },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.subtitle}>{contextCopy.subtitle}</Text>

                {pendingState === null ? (
                  <>
                    {/* OAuth (Google / Facebook / Apple) buttons removed
                        2026-04-27 alongside the L1 redesign. They will
                        come back post-launch once the providers are
                        wired in Supabase. Until then the form-only flow
                        is the canonical entry. */}

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
                        placeholder="Password (or use Magic Link)"
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

                    {/* ── Dual action buttons: Continue + Magic Link ─── */}
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
                            <Ionicons name="arrow-forward-circle" size={16} color={COLORS.white} />
                            <Text style={styles.passwordText}>Continue</Text>
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
                  // sentBox: shown after either a magic-link send OR a
                  // password-signup confirmation send. Sheet stays mounted
                  // here so the relay subscription stays alive — closing
                  // the sheet prematurely strands the user on a dead-end
                  // web page when their email link tap can't reach the
                  // running app.
                  <View style={styles.sentBox} testID="auth-sheet-sent-box">
                    <Ionicons name="checkmark-circle" size={44} color={COLORS.success} />
                    <Text style={styles.sentTitle}>Check your email</Text>
                    <Text style={styles.sentText}>
                      {pendingState === 'signup'
                        ? `We sent a confirmation link to ${email}. Tap it to finish creating your account.`
                        : `We sent a sign-in link to ${email}. Tap it to continue.`}
                    </Text>
                    <TouchableOpacity
                      onPress={handleResend}
                      style={styles.resendLink}
                      disabled={loading === 'resend'}
                      testID="auth-sheet-resend"
                    >
                      <Text style={styles.resendText}>
                        {loading === 'resend' ? 'Resending…' : 'Resend link'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Anon-to-authenticated PadPoints/saved-homes transfer copy
                    removed 2026-04-27: the actual transfer mechanism was
                    never built, so the promise was a lie. Filed as a
                    follow-up task. Restore copy once transfer ships. */}

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

      {/* JIT signup modal — fires when L1 signin fails Invalid login.
          Stacks above the L1 sheet (zIndex 999) since this overlay
          itself is at zIndex 999. Same Modal API guarantees it's on
          top of everything in the app. */}
      <UnlockAccountModal
        visible={showUnlockModal}
        email={email}
        busy={loading === 'password'}
        onCreate={runSignUp}
        onTryAgain={() => {
          if (loading === 'password') return;
          setShowUnlockModal(false);
        }}
      />

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
  modeToggle: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  modeToggleText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: '#6B5020',
    textAlign: 'center',
  },
  modeToggleLink: {
    fontFamily: FONTS.body.bold,
    color: COLORS.accent,
    textDecorationLine: 'underline',
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
