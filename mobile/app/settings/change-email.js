/**
 * Change Email — dedicated re-auth flow.
 *
 * Why this exists separately from edit-profile: email is auth identity,
 * not a profile attribute. Letting users free-text-edit it from a generic
 * "Edit Profile" form created two failure modes (anon-user crash and
 * silent collision with existing accounts). This screen scopes the operation
 * cleanly: anon users are bounced to AuthBottomSheet; authed users see their
 * current email + a single new-email field; collisions surface a clear
 * "Sign Out & Switch" CTA.
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAndroidBack from '../../hooks/useAndroidBack';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../providers/AlertProvider';
import { supabase } from '../../lib/supabase';
import { signOut } from '../../lib/auth';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ChangeEmailScreen() {
  useAndroidBack();
  const { user, isAnon } = useAuth();
  const alert = useAlert();

  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Hard guard — anon users have no email to change. Bounce immediately.
  useEffect(() => {
    if (isAnon || !user) {
      router.replace('/welcome');
    }
  }, [isAnon, user]);

  if (isAnon || !user) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </SafeAreaView>
    );
  }

  const currentEmail = (user.email || '').toLowerCase();

  async function handleSubmit() {
    const trimmed = newEmail.trim().toLowerCase();

    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (trimmed === currentEmail) {
      alert(
        "That's already your email",
        'The address you entered matches your current account email — no change needed.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) {
        if (/already.*registered|already.*exist/i.test(error.message)) {
          alert(
            'Email Already In Use',
            `An account with ${trimmed} already exists. If it's yours, sign out and sign back in with that email instead.`,
            [
              { text: 'Cancel' },
              {
                text: 'Sign Out & Switch',
                onPress: async () => {
                  try { await signOut(); } catch {}
                  router.replace('/welcome');
                },
              },
            ]
          );
          return;
        }
        throw new Error(error.message);
      }

      alert(
        'Verification Sent',
        `A confirmation link has been sent to ${trimmed}. Open that email and tap the link to complete the change. Your current email will continue to work until you confirm.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
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
            <Text style={styles.title}>Change Email</Text>
            <View style={styles.headerBtn} />
          </View>

          <Text style={styles.intro}>
            Your email is your account identity. Changing it requires confirmation from
            both your old and new addresses for security.
          </Text>

          {/* Current email card (read-only) */}
          <View style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <View style={[styles.iconBubble, { backgroundColor: COLORS.accent + '18' }]}>
                <Ionicons name="mail-open-outline" size={16} color={COLORS.accent} />
              </View>
              <Text style={styles.currentLabel}>Current Email</Text>
            </View>
            <Text style={styles.currentValue}>{currentEmail || 'Not set'}</Text>
          </View>

          {/* New email input */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <View style={[styles.iconBubble, { backgroundColor: COLORS.brandOrange + '18' }]}>
                <Ionicons name="mail-outline" size={16} color={COLORS.brandOrange} />
              </View>
              <Text style={styles.fieldLabel}>New Email Address</Text>
            </View>
            <TextInput
              testID="change-email-input"
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.slate}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            <Text style={styles.hint}>
              We'll send a confirmation link to this address. You must tap that
              link to complete the change.
            </Text>
          </View>

          {/* Submit button */}
          <Pressable
            testID="change-email-submit"
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={[COLORS.logoOrange, '#D14E2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={COLORS.white} />
                  <Text style={styles.submitText}>Send Verification Link</Text>
                </>
              )}
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
  intro: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.lg,
    lineHeight: 20,
  },
  currentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  currentLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  currentValue: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingLeft: 42,
  },
  fieldCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
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
  iconBubble: {
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
    color: COLORS.brandOrange,
    marginTop: 8,
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.lg,
    marginTop: 4,
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
