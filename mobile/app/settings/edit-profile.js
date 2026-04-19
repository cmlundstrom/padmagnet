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
  View, Text, TextInput, TouchableOpacity, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
  useAndroidBack();
  const { user, isAnon } = useAuth();
  const alert = useAlert();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

      alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
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
          {/* Header */}
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
            Update your display name and phone. To change your account email,
            use Change Email in Settings.
          </Text>

          {/* Display Name */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <View style={[styles.fieldIcon, { backgroundColor: COLORS.accent + '18' }]}>
                <Ionicons name="person-outline" size={16} color={COLORS.accent} />
              </View>
              <Text style={styles.fieldLabel}>Display Name</Text>
            </View>
            <TextInput
              testID="edit-profile-name-input"
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={COLORS.slate}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Phone */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <View style={[styles.fieldIcon, { backgroundColor: COLORS.success + '18' }]}>
                <Ionicons name="call-outline" size={16} color={COLORS.success} />
              </View>
              <Text style={styles.fieldLabel}>Phone Number</Text>
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
              Optional. Used for contact preferences or account recovery.
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

          {/* Email-change link — moved from this screen to its own re-auth flow */}
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
        </ScrollView>
      </KeyboardAvoidingView>
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
});
