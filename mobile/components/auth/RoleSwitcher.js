/**
 * Role Switcher — allows multi-role users to switch between renter/owner views.
 * Only visible to users with more than one role in their profiles.roles array.
 * Admins always see it (they have all roles).
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function RoleSwitcher() {
  const { session, role, roles, switchRole } = useAuth();
  const router = useRouter();

  // Only show if user has multiple roles
  if (!roles || roles.length <= 1) return null;

  const isRenter = role === 'tenant' || role === 'super_admin';
  const isOwner = role === 'owner';

  const handleSwitch = async (targetRole) => {
    if (targetRole === role) return;

    // 1. Update local AuthProvider state + AsyncStorage so the next render
    //    of RoleSwitcher reflects the new role and a future switch-back works.
    await switchRole(targetRole);

    // 2. Persist to profiles.role via direct REST so the choice survives
    //    sign-out + sign-in (resolveRole reads profiles.role on mount and
    //    overrides AsyncStorage). Same direct-PATCH pattern as auth-callback.js.
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
        console.error('[RoleSwitcher] persist role failed:', err.message);
      }
    }

    // 3. Navigate to the target tab group
    if (targetRole === 'owner') {
      router.replace('/(owner)/home');
    } else {
      router.replace('/(tenant)/swipe');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="swap-horizontal" size={16} color={COLORS.accent} />
        <Text style={styles.title}>Switch Role</Text>
      </View>
      <View style={styles.options}>
        <Pressable
          testID="role-switcher-renter"
          style={[styles.option, isRenter && styles.optionActive]}
          onPress={() => handleSwitch('tenant')}
        >
          <Ionicons name="home-outline" size={18} color={isRenter ? COLORS.white : COLORS.textSecondary} />
          <Text style={[styles.optionLabel, isRenter && styles.optionLabelActive]}>Renter</Text>
          {isRenter && <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />}
        </Pressable>
        <Pressable
          testID="role-switcher-owner"
          style={[styles.option, isOwner && styles.optionActive]}
          onPress={() => handleSwitch('owner')}
        >
          <Ionicons name="key-outline" size={18} color={isOwner ? COLORS.white : COLORS.textSecondary} />
          <Text style={[styles.optionLabel, isOwner && styles.optionLabelActive]}>Owner</Text>
          {isOwner && <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  options: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: LAYOUT.radius.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionActive: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent + '55',
  },
  optionLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  optionLabelActive: {
    color: COLORS.white,
  },
});
