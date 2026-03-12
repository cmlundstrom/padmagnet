import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
  const { user } = useAuth();
  const alert = useAlert();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current profile data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, email, phone')
        .eq('id', user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || '');
        setEmail(data.email || user.email || '');
        setPhone(data.phone || '');
      }
      setLoading(false);
    })();
  }, [user]);

  async function handleSave() {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      alert('Missing Name', 'Please enter your display name.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      // 1. Update profiles table (name + phone — NOT email, that syncs after confirmation)
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ display_name: trimmedName, phone: trimmedPhone })
        .eq('id', user.id);

      if (profileErr) throw new Error(profileErr.message);

      // 2. If email changed, trigger Supabase auth email change flow
      // This sends confirmation links to BOTH old and new addresses.
      // profiles.email is updated server-side only after both are confirmed.
      if (trimmedEmail !== user.email) {
        const { error: authErr } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (authErr) throw new Error(authErr.message);

        alert(
          'Confirmation Required',
          'Confirmation links have been sent to both your current and new email addresses. You must confirm both links to complete the change.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        alert('Saved', 'Your profile has been updated.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: LAYOUT.padding.md }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: LAYOUT.padding.lg }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontFamily: FONTS.body.medium, fontSize: FONT_SIZES.md, color: COLORS.accent }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={{
              flex: 1, textAlign: 'center',
              fontFamily: FONTS.heading.bold, fontSize: FONT_SIZES.xl, color: COLORS.text,
            }}>
              Edit Profile
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={{
                fontFamily: FONTS.body.semiBold, fontSize: FONT_SIZES.md,
                color: saving ? COLORS.slate : COLORS.accent,
              }}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Display Name */}
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={COLORS.slate}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.slate}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          {email.trim().toLowerCase() !== (user?.email || '') && (
            <Text style={styles.hint}>
              Changing your email requires confirmation. A link will be sent to your new address.
            </Text>
          )}

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={v => setPhone(formatPhone(v))}
            placeholder="(555) 123-4567"
            placeholderTextColor={COLORS.slate}
            keyboardType="phone-pad"
            returnKeyType="done"
          />
          <Text style={styles.hint}>
            Optional. Used for contact preferences on your listings or account recovery.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  label: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
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
  },
};
