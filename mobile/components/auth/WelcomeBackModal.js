import { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ManilaCard from '../ui/ManilaCard';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

// WelcomeBackModal — gate shown after a returning archived user signs in.
// Surfaces "your account was paused, want it back?" + 2 CTAs:
//   - Reactivate    → POST /api/account/reactivate, then dismiss
//   - Not now       → signs the user out (so they don't sit in app archived)
//
// Listings stay archived intentionally even after reactivation; the owner
// re-publishes each one from the Owners tab. Mirrors admin unarchive policy.
//
// Render is gated on the AuthProvider's archivedAt flag (fetched as part of
// resolveRole post-signin). Shown over any tab group via _layout.js.
export default function WelcomeBackModal({
  visible, displayName, archivedAt, onReactivate, onDismiss,
}) {
  const alert = useAlert();
  const [busy, setBusy] = useState(null); // 'reactivate' | 'dismiss' | null

  // Block hardware back from closing — user must explicitly choose.
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => handler.remove();
  }, [visible]);

  async function handleReactivate() {
    setBusy('reactivate');
    try {
      await onReactivate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      alert("Couldn't reactivate", err.message || 'Please try again.');
      setBusy(null);
    }
  }

  async function handleDismiss() {
    setBusy('dismiss');
    try {
      await onDismiss();
    } catch (err) {
      alert('Sign out failed', err.message || 'Please try again.');
      setBusy(null);
    }
  }

  const greetingName = displayName ? displayName.split(' ')[0] : null;
  const archivedLabel = archivedAt
    ? new Date(archivedAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => { /* gate — back is a no-op */ }}
    >
      <View style={styles.backdrop}>
        <View style={styles.cardWrap}>
          <ManilaCard label="WELCOME BACK" tabAlign="center" tabWidth={180}>
            <View style={styles.body}>
              <View style={styles.iconRow}>
                <Ionicons name="time-outline" size={36} color="#5A4420" />
              </View>

              <Text style={styles.title}>
                {greetingName ? `Welcome back, ${greetingName}!` : 'Welcome back!'}
              </Text>

              <Text style={styles.subtitle}>
                {archivedLabel
                  ? `Your account was paused on ${archivedLabel}. Reactivate to pick up where you left off — your matches, points, and profile are still here.`
                  : 'Your account is paused. Reactivate to pick up where you left off — your matches, points, and profile are still here.'}
              </Text>

              <Text style={styles.fineprint}>
                Old listings stay paused. You can re-publish them one by one from the Owners tab.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, busy === 'reactivate' && styles.btnDisabled]}
                onPress={handleReactivate}
                disabled={busy !== null}
                testID="welcome-back-reactivate"
              >
                {busy === 'reactivate' ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color={COLORS.white} />
                    <Text style={styles.primaryBtnText}>Reactivate my account</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleDismiss}
                disabled={busy !== null}
                testID="welcome-back-dismiss"
              >
                <Text style={styles.secondaryBtnText}>Not now — sign me out</Text>
              </TouchableOpacity>
            </View>
          </ManilaCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  cardWrap: {
    width: '100%',
    alignItems: 'center',
  },
  body: {
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'stretch',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: '#3A2810',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#4A3520',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 12,
  },
  fineprint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: '#6B5020',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: LAYOUT.padding.lg,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 13,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: '#6B5020',
    textDecorationLine: 'underline',
  },
});
