import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, BackHandler } from 'react-native';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ManilaCard from '../ui/ManilaCard';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

// UnlockAccountModal — replaces the prior "Couldn't sign you in" system
// alert that fired when L1 signin failed with Invalid login. The previous
// alert framed the moment as a failure ("we couldn't…") which discouraged
// brand-new users — the dominant case at this surface.
//
// New framing: "Unlock Your Search" + a tap-to-create primary CTA with
// brand presence (manila card, PadMagnet logo, magnet-icon orange
// gradient button). "Try again" is a discrete secondary link for
// returning users who mistyped their password.
//
// Props:
//   visible: boolean — controls modal visibility
//   email: string — the email the user typed (for personalization)
//   busy: boolean — disables both CTAs while signUp is in-flight
//   onCreate: async () => void — fires runSignUp upstream
//   onTryAgain: () => void — dismisses, parent re-shows form
export default function UnlockAccountModal({ visible, email, busy, onCreate, onTryAgain }) {
  // Hardware back acts like Try again — dismisses the modal cleanly so
  // the user can retype rather than getting stuck.
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) onTryAgain();
      return true;
    });
    return () => handler.remove();
  }, [visible, busy, onTryAgain]);

  function handleCreate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreate?.();
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => { /* handled via BackHandler so we can gate on busy */ }}
    >
      <View style={styles.backdrop}>
        <View style={styles.cardWrap}>
          <ManilaCard label="UNLOCK" tabAlign="center" tabWidth={140}>
            <View style={styles.body}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />

              <Text style={styles.title}>Unlock Your Search</Text>

              <Text style={styles.subtitle}>
                You’re a tap away from messaging owners and saving listings.
              </Text>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={busy}
                testID="unlock-account-create"
                activeOpacity={0.9}
                style={styles.primaryBtnWrap}
              >
                <LinearGradient
                  colors={[COLORS.logoOrange, '#D14E2F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                >
                  {busy ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="magnet" size={22} color={COLORS.white} />
                      <Text style={styles.primaryBtnText}>Create new account</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onTryAgain}
                disabled={busy}
                testID="unlock-account-try-again"
                style={styles.secondaryBtn}
                hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              >
                <Text style={styles.secondaryText}>
                  Try again with a different password
                </Text>
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
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: LAYOUT.radius.md,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: '#3A2810',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: '#4A3520',
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.lg,
  },
  primaryBtnWrap: {
    borderRadius: LAYOUT.radius.xl,
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: LAYOUT.radius.xl,
  },
  primaryBtnText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: '#6B5020',
    textDecorationLine: 'underline',
  },
});
