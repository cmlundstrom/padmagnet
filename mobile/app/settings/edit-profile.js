/**
 * Edit Profile — display name + phone only.
 *
 * Email editing was removed from this screen and moved to a dedicated
 * /settings/change-email re-auth flow. Email is auth identity, not a
 * profile attribute, so free-text editing it from a generic profile form
 * created two failure modes (anon-user crash, silent collision with
 * existing accounts). This screen now only edits the two fields that are
 * truly profile attributes.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, Modal,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAndroidBack from '../../hooks/useAndroidBack';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../providers/AlertProvider';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function EditProfileScreen() {
  // First-time mode (?firstTime=true): user just authed and we interposed
  // this screen to capture display_name. They cannot back out via hardware
  // back or the close X — only path forward is to fill the required field
  // and Save, which routes to ?next=<intended-dest> from the auth flow.
  const { firstTime, next } = useLocalSearchParams();
  const isFirstTime = firstTime === 'true' || firstTime === '1';

  // Block hardware back in firstTime mode — return true means handled.
  useAndroidBack(isFirstTime ? () => true : undefined);

  const { user, isAnon, role } = useAuth();
  const alert = useAlert();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPhoneTooltip, setShowPhoneTooltip] = useState(false);
  // Safe-area-bottom inset prevents the Save Changes button from
  // extending into the Android system nav bar area, where taps get
  // intercepted as HOME button presses (literally backgrounded the
  // app). Diagnosed 2026-04-28 via the Fix B intent-restoration smoke
  // — Maestro's tap at the button's vertical center landed at y=2196
  // on a 1080x2280 screen, hitting the system nav bar.
  const insets = useSafeAreaInsets();

  // Hard guard — anon users have no profile to edit. Bounce immediately.
  useEffect(() => {
    if (isAnon || !user) {
      router.replace('/welcome');
    }
  }, [isAnon, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, phone')
        .eq('id', user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || '');
        setPhone(data.phone || '');
      }
      setLoading(false);
    })();
  }, [user]);

  async function handleSave() {
    if (!user) return;

    const trimmedName = displayName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      alert('Missing Name', 'Please enter your display name.');
      return;
    }

    setSaving(true);
    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ display_name: trimmedName, phone: trimmedPhone })
        .eq('id', user.id);

      if (profileErr) throw new Error(profileErr.message);

      // Where do we go after Save?
      //   - First-time onboarding: route to the deferred ?next= path
      //     (e.g. the listing detail the user was about to message about)
      //   - Normal edit: pop back to wherever they came from
      const dest = isFirstTime && next ? decodeURIComponent(next) : null;
      const successCopy = isFirstTime
        ? 'You’re all set. Continuing…'
        : 'Your profile has been updated.';
      alert('Saved', successCopy, [
        {
          text: 'OK',
          onPress: () => {
            if (dest) router.replace(dest);
            else router.back();
          },
        },
      ]);
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isAnon || !user || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isFirstTime && styles.firstTimeScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {isFirstTime ? (
            // First-time brand band: anchors the screen with the PadMagnet
            // mark and a subtle warm gradient that sets it apart from
            // settings utility chrome. No top-right Save link in this
            // mode — the bottom magnet CTA is the single action.
            <LinearGradient
              colors={['rgba(232,96,60,0.18)', 'rgba(35,65,112,0.55)', 'rgba(26,51,88,0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.firstTimeBand}
            >
              <Image
                source={require('../../assets/icon.png')}
                style={styles.firstTimeBrandLogo}
                resizeMode="contain"
              />
              <Text style={[styles.title, styles.firstTimeTitle]}>Last Step</Text>
              <Text style={[styles.introText, styles.firstTimeIntroText]}>
                {role === 'owner'
                  ? 'You’re in. What name should renters see? We’ll take it from there.'
                  : 'You’re in. What name should owners see? We’ll take it from there.'}
              </Text>
            </LinearGradient>
          ) : (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                  <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Profile</Text>
                <TouchableOpacity testID="edit-profile-save-header" onPress={handleSave} disabled={saving} style={styles.headerBtn}>
                  <Text style={[styles.saveText, saving && { color: COLORS.slate }]}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.introText}>
                Update your display name and phone. To change your account email, use Change Email in Settings.
              </Text>
            </>
          )}

          {/* Display Name — required. In firstTime mode the field renders
              flat (no card chrome) so the brand band carries the visual
              weight; in normal Edit Profile mode it stays carded so it
              fits the rest of the settings UI. */}
          <View style={isFirstTime ? styles.firstTimeField : styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <View style={[styles.fieldIcon, { backgroundColor: COLORS.accent + '18' }]}>
                <Ionicons name="person-outline" size={16} color={COLORS.accent} />
              </View>
              <Text style={styles.fieldLabel}>
                Display Name <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <TextInput
              testID="edit-profile-name-input"
              style={[styles.input, isFirstTime && styles.firstTimeInput]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={role === 'owner' ? 'What should renters call you?' : 'What should owners call you?'}
              placeholderTextColor={COLORS.slate}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Text style={styles.hint}>
              {role === 'owner'
                ? 'Renters see this on every message. Use a real first name — most renters trust real names over handles like “Owner123”.'
                : 'Owners see this on every message. Use a real first name — most owners decline messages from handles like “User123”.'}
            </Text>
          </View>

          {/* Phone — optional. Info icon in the label opens a tooltip
              modal explaining why providing it unlocks more value. */}
          <View style={isFirstTime ? styles.firstTimeField : styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <View style={[styles.fieldIcon, { backgroundColor: COLORS.success + '18' }]}>
                <Ionicons name="call-outline" size={16} color={COLORS.success} />
              </View>
              <Text style={styles.fieldLabel}>Phone Number (optional)</Text>
              <TouchableOpacity
                onPress={() => setShowPhoneTooltip(true)}
                hitSlop={10}
                style={styles.infoIcon}
                testID="edit-profile-phone-info"
              >
                <Ionicons name="information-circle-outline" size={18} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
            <TextInput
              testID="edit-profile-phone-input"
              style={[styles.input, isFirstTime && styles.firstTimeInput]}
              value={phone}
              onChangeText={v => setPhone(formatPhone(v))}
              placeholder="(555) 123-4567"
              placeholderTextColor={COLORS.slate}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
            <Text style={styles.hint}>
              Tap the info icon to see why owners prefer renters who share a number.
            </Text>
          </View>

          {/* Bottom Save CTA. firstTime gets a beefier button (more padding,
              larger label, magnet icon) since it's the only action on the
              screen. Normal Edit Profile keeps the existing checkmark CTA. */}
          <Pressable
            testID="edit-profile-save-bottom"
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={[COLORS.logoOrange, '#D14E2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bottomSaveBtn, isFirstTime && styles.firstTimeBottomSaveBtn]}
            >
              <Ionicons
                name={isFirstTime ? 'magnet' : 'checkmark-circle'}
                size={isFirstTime ? 22 : 18}
                color={COLORS.white}
              />
              <Text style={[styles.bottomSaveText, isFirstTime && styles.firstTimeBottomSaveText]}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Email-change link — only shown in normal edit mode. In first-time
              onboarding the user just signed in, so prompting "change email"
              is confusing UX. */}
          {!isFirstTime && (
            <TouchableOpacity
              testID="edit-profile-change-email-link"
              style={styles.changeEmailLink}
              onPress={() => router.replace('/settings/change-email')}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-open-outline" size={16} color={COLORS.accent} />
              <Text style={styles.changeEmailLinkText}>Need to change your email instead?</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.accent} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Phone tooltip — opens from the info icon next to the Phone label.
          Stateless: every tap re-opens fresh. */}
      <Modal
        visible={showPhoneTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhoneTooltip(false)}
      >
        <Pressable style={styles.tooltipBackdrop} onPress={() => setShowPhoneTooltip(false)}>
          <Pressable style={styles.tooltipCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.tooltipIcon, { backgroundColor: COLORS.success + '22' }]}>
              <Ionicons name="call" size={26} color={COLORS.success} />
            </View>
            <Text style={styles.tooltipTitle}>Why share your phone?</Text>
            <View style={styles.tooltipBullets}>
              <View style={styles.tooltipBulletRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.tooltipBulletText}>Owners can text you back directly when they’re interested.</Text>
              </View>
              <View style={styles.tooltipBulletRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.tooltipBulletText}>Get SMS alerts when new listings hit your saved zone.</Text>
              </View>
              <View style={styles.tooltipBulletRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.tooltipBulletText}>Required if you enable SMS notifications later.</Text>
              </View>
              <View style={styles.tooltipBulletRow}>
                <Ionicons name="lock-closed" size={16} color={COLORS.accent} />
                <Text style={styles.tooltipBulletText}>We never share your number publicly or sell it.</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setShowPhoneTooltip(false)}
              style={({ pressed }) => [styles.tooltipGotIt, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.tooltipGotItText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: LAYOUT.padding.md,
    paddingBottom: 360,
  },
  // First-time mode pulls the brand band tight to the safe-area top
  // and zeroes the sides so the gradient runs edge-to-edge.
  // paddingBottom is just enough breathing room for the magnet CTA;
  // SafeAreaView edges=['top','bottom'] handles keeping the button
  // out of the Android system nav bar zone so we don't need a giant
  // 360px buffer (which previously scrolled the button half off-screen).
  firstTimeScrollContent: {
    padding: 0,
    paddingBottom: 48,
  },
  // Brand band: warm orange glow at the top fading into navy. Carries
  // the logo + "Last Step" + intro copy so the whole header reads as
  // a single anchored unit instead of a settings-screen header.
  firstTimeBand: {
    paddingTop: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding.xl,
    paddingHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.lg,
    alignItems: 'center',
  },
  firstTimeBrandLogo: {
    width: 72,
    height: 72,
    borderRadius: LAYOUT.radius.md,
    marginBottom: LAYOUT.padding.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  headerBtn: {
    minWidth: 60,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
  },
  // First-time mode: this is the renter's first authenticated screen,
  // so the header carries more visual weight than a settings utility.
  // Bump size + add letter-spacing + a subtle text-shadow for crispness
  // against the navy backdrop. Brand accent on a corner mark would pop
  // here too — leaving room for follow-up polish per Chris 2026-04-27.
  firstTimeTitle: {
    fontSize: FONT_SIZES['2xl'],
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  saveText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
    textAlign: 'right',
  },
  introText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.lg,
    lineHeight: 20,
  },
  // First-time intro: the new copy is conversational ("You're in. What
  // name should owners see?"), so it deserves brighter color and a touch
  // more weight than the muted settings-mode subtitle. Pulls into
  // primary text color, ups size to md, and bumps line-height for
  // breathing room.
  firstTimeIntroText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 24,
    paddingHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.xl,
  },
  fieldCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  // First-time fields render flat — no surface bg, no border, no shadow.
  // Drops the double-card stacking and lets the brand band carry the
  // visual weight. The colored field icon stays so the affordance is
  // still readable.
  firstTimeField: {
    paddingHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.lg,
  },
  // First-time input is taller + has a softer surface tint so it pops
  // off the flat background without the heavy bordered-card chrome.
  firstTimeInput: {
    backgroundColor: 'rgba(35,65,112,0.55)',
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 16,
    fontSize: FONT_SIZES.md,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  required: {
    color: COLORS.logoOrange,
    fontFamily: FONTS.body.bold,
  },
  infoIcon: {
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 6,
    lineHeight: 16,
  },
  bottomSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.lg,
    marginTop: 8,
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  // First-time CTA: bigger touch target, deeper glow, larger label.
  // It's the only action on the screen (no top-right Save link), so it
  // earns the visual weight. Magnet icon swaps in for the checkmark
  // via the JSX so the action ties back to the brand.
  firstTimeBottomSaveBtn: {
    paddingVertical: 18,
    marginHorizontal: LAYOUT.padding.md,
    marginTop: LAYOUT.padding.sm,
    borderRadius: LAYOUT.radius.xl,
    gap: 10,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSaveText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  firstTimeBottomSaveText: {
    fontSize: FONT_SIZES.lg,
    letterSpacing: 0.3,
  },
  changeEmailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.radius.md,
    backgroundColor: COLORS.accent + '10',
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
  },
  changeEmailLinkText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },

  // ── Phone tooltip modal ───────────────────────────────────────
  tooltipBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
  },
  tooltipCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  tooltipIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  tooltipTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  tooltipBullets: {
    alignSelf: 'stretch',
    marginBottom: LAYOUT.padding.md,
    gap: 10,
  },
  tooltipBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tooltipBulletText: {
    flex: 1,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  tooltipGotIt: {
    backgroundColor: COLORS.logoOrange,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: LAYOUT.radius.full,
  },
  tooltipGotItText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    letterSpacing: 0.4,
  },
});
