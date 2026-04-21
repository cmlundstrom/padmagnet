import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useAndroidBack from '../../hooks/useAndroidBack';
import { BackButton } from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

// Self-service Add Role screen — closes the Phase 3 acquisition path that
// was in project_auth_rebuild_plan.md but never shipped. Lets a general
// user grow their roles[] array from one role to two without admin
// intervention. Only rendered when the user currently has exactly one
// role; multi-role users use RoleSwitcher from Profile instead.
export default function AddRoleScreen() {
  useAndroidBack();
  const { session, role, roles, switchRole } = useAuth();
  const alert = useAlert();
  const [adding, setAdding] = useState(false);

  // Target the role the user is MISSING from roles[], not the inverse of
  // their active role. Otherwise, a user whose active role doesn't match
  // their actual assigned roles (e.g. just switched active role before
  // acquiring the new role) sees the wrong target.
  const heldRoles = roles || [];
  const hasOwner = heldRoles.includes('owner');
  const hasTenant = heldRoles.includes('tenant');
  const targetRole = hasOwner && !hasTenant ? 'tenant'
    : hasTenant && !hasOwner ? 'owner'
    : (role === 'owner' ? 'tenant' : 'owner');
  const currentLabel = hasOwner && !hasTenant ? 'Owner' : 'Renter';
  const targetLabel = targetRole === 'owner' ? 'Owner' : 'Renter';
  const alreadyHasRole = heldRoles.includes(targetRole);

  const targetIcon = targetRole === 'owner' ? 'key' : 'home';
  const targetColor = targetRole === 'owner' ? COLORS.accent : COLORS.logoOrange;

  const handleAdd = async () => {
    setAdding(true);
    try {
      // 1. Grow roles[] via the add-role API (idempotent server-side)
      await apiFetch('/api/profiles/add-role', {
        method: 'POST',
        body: JSON.stringify({ targetRole }),
      });

      // 2. Flip local active role + roles[] in AuthProvider. Passing the
      //    freshly-grown roles array is critical — otherwise the context
      //    still advertises the old single-role set until next sign-in,
      //    which would break any downstream role check.
      const newRoles = Array.from(new Set([...heldRoles, targetRole]));
      await switchRole(targetRole, newRoles);

      // 3. Persist active role to profiles.role — same direct REST pattern
      //    RoleSwitcher uses so next sign-in lands in the new role
      if (session?.access_token && session?.user?.id) {
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
          await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${session.user.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ role: targetRole }),
          });
        } catch (err) {
          console.error('[AddRole] persist active role failed:', err.message);
        }
      }

      // 4. Navigate into the new role's home
      if (targetRole === 'owner') {
        router.replace('/(owner)/home');
      } else {
        router.replace('/(tenant)/swipe');
      }
    } catch (err) {
      alert('Could not add role', err.message);
      setAdding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.backRow}>
            <BackButton />
            <Text style={styles.backText}>Add {targetLabel} Role</Text>
          </View>

          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: targetColor + '22', borderColor: targetColor + '55' }]}>
              <Ionicons name={targetIcon} size={44} color={targetColor} />
            </View>
          </View>

          <Text style={styles.title}>Become a {targetLabel} too</Text>
          <Text style={styles.body}>
            You're currently a {currentLabel}. Adding the {targetLabel} role lets you use both sides of
            PadMagnet without creating a second account — switch between {currentLabel.toLowerCase()} and {targetLabel.toLowerCase()} views
            anytime from your Profile.
          </Text>

          <View style={styles.list}>
            {targetRole === 'owner' ? (
              <>
                <Row icon="add-circle" color={COLORS.accent} text="List your own properties" />
                <Row icon="people" color={COLORS.accent} text="Receive and manage renter inquiries" />
                <Row icon="bar-chart" color={COLORS.accent} text="Track views, contacts, and performance" />
              </>
            ) : (
              <>
                <Row icon="search" color={COLORS.logoOrange} text="Swipe through rentals in your area" />
                <Row icon="heart" color={COLORS.logoOrange} text="Save favorites and message property owners" />
                <Row icon="sparkles" color={COLORS.logoOrange} text="Earn PadPoints and unlock Ask Pad" />
              </>
            )}
          </View>

          <View style={styles.reassure}>
            <Ionicons name="information-circle" size={18} color={COLORS.textSecondary} />
            <Text style={styles.reassureText}>
              Nothing in your {currentLabel.toLowerCase()} profile changes. Same account, same login — just more surface area.
            </Text>
          </View>

          {alreadyHasRole ? (
            <View style={[styles.cta, styles.ctaDisabled]}>
              <Text style={styles.ctaDisabledText}>You already have the {targetLabel} role</Text>
            </View>
          ) : (
            <TouchableOpacity
              testID="settings-add-role-confirm-button"
              style={[styles.cta, { backgroundColor: targetColor }]}
              onPress={handleAdd}
              disabled={adding}
              activeOpacity={0.85}
            >
              {adding ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.ctaText}>Add {targetLabel} Role</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            testID="settings-add-role-cancel-button"
            style={styles.cancelBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Not now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ icon, color, text }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: LAYOUT.padding.md },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: LAYOUT.padding.lg, gap: 8 },
  backText: { fontFamily: FONTS.heading.semiBold, fontSize: FONT_SIZES.lg, color: COLORS.text },
  iconWrap: { alignItems: 'center', marginBottom: LAYOUT.padding.md },
  iconCircle: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  body: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: LAYOUT.padding.lg,
    paddingHorizontal: LAYOUT.padding.sm,
  },
  list: { gap: 10, marginBottom: LAYOUT.padding.lg, paddingHorizontal: LAYOUT.padding.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontFamily: FONTS.body.medium, fontSize: FONT_SIZES.sm, color: COLORS.text, flex: 1 },
  reassure: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reassureText: {
    flex: 1,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cta: {
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  ctaDisabled: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  ctaDisabledText: { fontFamily: FONTS.body.semiBold, fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  ctaText: { fontFamily: FONTS.body.bold, fontSize: FONT_SIZES.md, color: COLORS.white },
  cancelBtn: {
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontFamily: FONTS.body.semiBold, fontSize: FONT_SIZES.md, color: COLORS.text },
});
