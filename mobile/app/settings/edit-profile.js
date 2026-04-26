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
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const { user, isAnon } = useAuth();
  const alert = useAlert();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPhoneTooltip, setShowPhoneTooltip] = useState(false);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header — close button hidden in first-time mode so the user
              can only proceed by completing the required field. */}
          <View style={styles.header}>
            {isFirstTime ? (
              <View style={styles.headerBtn} />
            ) : (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>
              {isFirstTime ? 'Last Step' : 'Edit Profile'}
            </Text>
            <TouchableOpacity testID="edit-profile-save-header" onPress={handleSave} disabled={saving} style={styles.headerBtn}>
              <Text style={[styles.saveText, saving && { color: COLORS.slate }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.introText}>
            {isFirstTime
              ? 'Welcome to PadMagnet. Tell owners what to call you, then we’ll continue.'
              : 'Update your display name and phone. To change your account email, use Change Email in Settings.'}
          </Text>

          {/* Display Name — required. The placeholder is the punchy hook
              ("What should owners call you?") and the helper text below
              explains why frivolous handles get ignored by owners. */}
          <View style={styles.fieldCard}>
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
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="What should owners call you?"
              placeholderTextColor={COLORS.slate}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Text style={styles.hint}>
              Owners see this on every message. Use a real first name — most owners decline messages from handles like “User123”.
            </Text>
          </View>

          {/* Phone — optional. Info icon in the label opens a tooltip
              modal explaining why providing it unlocks more value. */}
          <View style={styles.fieldCard}>
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
              style={styles.input}
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

          {/* Bottom Save Button */}
          <Pressable testID="edit-profile-save-bottom" onPress={handleSave} disabled={saving} style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
            <LinearGradient
              colors={[COLORS.logoOrange, '#D14E2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bottomSaveBtn}
            >
              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
              <Text style={styles.bottomSaveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
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
  bottomSaveText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
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
