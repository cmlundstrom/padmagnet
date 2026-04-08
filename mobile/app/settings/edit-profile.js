import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const EMAIL_CHANGE_HINT = 'Changing your email will send a confirmation link to your new address. You must tap that link to complete the change.';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const alert = useAlert();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const originalEmail = useRef('');

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
        setEmail(data.email || '');
        setPhone(data.phone || '');
        originalEmail.current = (data.email || '').toLowerCase();
      }
      setLoading(false);
    })();
  }, [user]);

  const emailChanged = email.trim().toLowerCase() !== originalEmail.current;

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
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ display_name: trimmedName, phone: trimmedPhone })
        .eq('id', user.id);

      if (profileErr) throw new Error(profileErr.message);

      if (trimmedEmail !== originalEmail.current) {
        const { error: authErr } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (authErr) throw new Error(authErr.message);

        alert(
          'Confirmation Required',
          EMAIL_CHANGE_HINT + '\n\nA confirmation link has been sent to ' + trimmedEmail + '. Open that email and tap the link to complete the change.',
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
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerBtn}>
              <Text style={[styles.saveText, saving && { color: COLORS.slate }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.introText}>
            Keep your contact info up to date so property owners can reach you.
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
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={COLORS.slate}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Email */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <View style={[styles.fieldIcon, { backgroundColor: COLORS.brandOrange + '18' }]}>
                <Ionicons name="mail-outline" size={16} color={COLORS.brandOrange} />
              </View>
              <Text style={styles.fieldLabel}>Email Address</Text>
            </View>
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
            <Text style={[styles.hint, emailChanged && styles.hintActive]}>
              {EMAIL_CHANGE_HINT}
            </Text>
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
          <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
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
    paddingBottom: 300,
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
  hintActive: {
    color: COLORS.warning,
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
});
