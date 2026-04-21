/**
 * Role Switcher — allows multi-role users to switch between renter/owner views.
 * Only visible to users with more than one role in their profiles.roles array.
 * Admins always see it (they have all roles).
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { performRoleSwitch } from '../../lib/role-switch';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function RoleSwitcher() {
  const { session, role, roles, switchRole } = useAuth();
  const router = useRouter();
  const [switching, setSwitching] = useState(null);

  // Only show if user has multiple roles
  if (!roles || roles.length <= 1) return null;

  const isRenter = role === 'tenant' || role === 'super_admin';
  const isOwner = role === 'owner';
  const busy = !!switching;

  const handleSwitch = async (targetRole) => {
    if (busy || targetRole === role) return;
    setSwitching(targetRole);
    try {
      await performRoleSwitch({ targetRole, session, switchRole, router });
    } finally {
      // Navigation has already fired by now; clearing state just releases
      // the visual busy lock in case the component is still mounted
      // (e.g. user switches back quickly).
      setSwitching(null);
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
          style={[styles.option, isRenter && styles.optionActive, busy && styles.optionBusy]}
          onPress={() => handleSwitch('tenant')}
          disabled={busy}
        >
          {switching === 'tenant' ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <>
              <Ionicons name="home-outline" size={18} color={isRenter ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.optionLabel, isRenter && styles.optionLabelActive]}>Renter</Text>
              {isRenter && <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />}
            </>
          )}
        </Pressable>
        <Pressable
          testID="role-switcher-owner"
          style={[styles.option, isOwner && styles.optionActive, busy && styles.optionBusy]}
          onPress={() => handleSwitch('owner')}
          disabled={busy}
        >
          {switching === 'owner' ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <>
              <Ionicons name="key-outline" size={18} color={isOwner ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.optionLabel, isOwner && styles.optionLabelActive]}>Owner</Text>
              {isOwner && <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />}
            </>
          )}
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
  optionBusy: {
    opacity: 0.6,
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
