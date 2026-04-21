/**
 * Role Switcher — allows multi-role users to switch between renter/owner views.
 * Only visible to users with more than one role in their profiles.roles array.
 * Admins always see it (they have all roles).
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      setSwitching(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="swap-horizontal" size={16} color={COLORS.logoOrange} />
        <Text style={styles.title}>Switch Role</Text>
      </View>

      {/* Orange gradient pill — matches the Enable Location / sign-in CTA
          treatment. Buttons sit on top in blue (active) or translucent-dark
          (inactive). Shine + inner glow + bottom edge give it 3D depth. */}
      <View style={styles.pillWrap}>
        <LinearGradient
          colors={['#FF8C38', '#F97316', COLORS.logoOrange, '#DC5A2C', '#B84A1C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pillGradient}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.pillShine}
          />
          <LinearGradient
            colors={['rgba(255,200,100,0.25)', 'transparent']}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.pillInnerGlow}
          />

          <View style={styles.options}>
            <RoleOption
              testID="role-switcher-renter"
              icon="home-outline"
              label="Renter"
              active={isRenter}
              busy={busy}
              loading={switching === 'tenant'}
              onPress={() => handleSwitch('tenant')}
            />
            <RoleOption
              testID="role-switcher-owner"
              icon="key-outline"
              label="Owner"
              active={isOwner}
              busy={busy}
              loading={switching === 'owner'}
              onPress={() => handleSwitch('owner')}
            />
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.pillBottomEdge}
          />
        </LinearGradient>
      </View>
    </View>
  );
}

function RoleOption({ testID, icon, label, active, busy, loading, onPress }) {
  return (
    <Pressable
      testID={testID}
      style={[
        styles.option,
        active ? styles.optionActive : styles.optionInactive,
        busy && styles.optionBusy,
      ]}
      onPress={onPress}
      disabled={busy}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.white} />
      ) : (
        <>
          <Ionicons name={icon} size={18} color={COLORS.white} />
          <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{label}</Text>
          {active && <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />}
        </>
      )}
    </Pressable>
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
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  // Orange gradient pill wrapping the two options
  pillWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,180,80,0.4)',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  pillGradient: {
    padding: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  pillShine: {
    ...StyleSheet.absoluteFillObject,
    bottom: '50%',
  },
  pillInnerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  pillBottomEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
  },

  options: {
    flexDirection: 'row',
    gap: 6,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionInactive: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderColor: 'rgba(0,0,0,0.25)',
  },
  optionActive: {
    backgroundColor: COLORS.accent,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  optionBusy: {
    opacity: 0.6,
  },
  optionLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  optionLabelActive: {
    fontFamily: FONTS.body.bold,
  },
});
