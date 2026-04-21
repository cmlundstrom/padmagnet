import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from '../../lib/auth';
import RoleSwitcher from '../../components/auth/RoleSwitcher';
import { performRoleSwitch } from '../../lib/role-switch';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';
import ProfileCard from '../../components/screens/ProfileCard';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import OwnerHeader from '../../components/owner/OwnerHeader';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { EqualHousingBadge } from '../../components/ui';

export default function OwnerProfileScreen() {
  const { session, user, role, roles, isAnon, switchRole } = useAuth();
  const { tier } = useSubscription();
  const hasTenantRole = (roles || []).includes('tenant');
  const [profile, setProfile] = useState({});
  const [showAuth, setShowAuth] = useState(false);

  const fetchProfile = useCallback(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, email, phone')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  async function handleSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  // Initials for avatar
  const initials = isAnon ? '?' : (profile.display_name || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const tierColor = tier === 'premium' ? COLORS.gold
    : tier === 'pro' ? COLORS.accent
    : COLORS.slate;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OwnerHeader minimal />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero header — avatar + name */}
        <View style={styles.heroHeader}>
          <View style={[styles.avatar, { borderColor: isAnon ? COLORS.slate : tierColor }]}>
            <LinearGradient
              colors={isAnon ? ['#64748B', '#475569'] : tier === 'premium' ? ['#FFD700', '#C4A030'] : tier === 'pro' ? ['#3B82F6', '#2563EB'] : ['#64748B', '#475569']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.heroName}>{isAnon ? 'Guest Owner' : (profile.display_name || 'Set Your Name')}</Text>
          <Text style={styles.heroRole}>{isAnon ? 'Browsing as guest' : 'Property Owner'}</Text>
        </View>

        {/* Role switcher — renders null for single-role / anon users, so it
            only appears for dual-role authenticated accounts. Above the fold
            so an owner can flip to renter (or back) without scrolling past
            Settings menu items. */}
        <RoleSwitcher />

        {/* Anonymous value pitch — hero CTA. Full art treatment (5-stop
            orange gradient + shine + inner glow + warm shadow) matches the
            renter profile sign-in CTA and the Enable Location L2 button. */}
        {isAnon && (
          <TouchableOpacity testID="profile-sign-in-card-button" style={styles.signInCard} onPress={() => setShowAuth(true)} activeOpacity={0.85}>
            <LinearGradient
              colors={['#FF8C38', '#F97316', COLORS.logoOrange, '#DC5A2C', '#B84A1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signInGradient}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.signInShine}
              />
              <LinearGradient
                colors={['rgba(255,200,100,0.25)', 'transparent']}
                start={{ x: 0.5, y: 0.3 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.signInInnerGlow}
              />
              <View style={styles.signInContent}>
                <View style={styles.signInIconWrap}>
                  <Ionicons name="key-outline" size={20} color={COLORS.white} />
                </View>
                <View style={styles.signInTextWrap}>
                  <Text style={styles.signInHeadline}>List Your Property</Text>
                  <Text style={styles.signInCaption}>
                    Connect with renters, track views and performance.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
              </View>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.15)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.signInBottomEdge}
              />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Sign out — always visible for testing */}
        {isAnon && (
          <TouchableOpacity testID="profile-sign-out-button" style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Profile card — only for authenticated. Read-only display. */}
        {!isAnon && (
          <ProfileCard
            displayName={profile.display_name}
            email={profile.email}
            phone={profile.phone}
          />
        )}

        {/* Settings section — gated for anon */}
        {!isAnon && (
          <>
            <Text style={styles.sectionLabel}>SETTINGS</Text>

            <MenuItem
              testID="profile-subscription-button"
              icon="card-outline"
              iconColor={COLORS.accent}
              label="Subscription & Billing"
              hint="Manage your plan and payment history"
              onPress={() => router.push('/settings/subscription')}
            />
            <MenuItem
              testID="profile-notifications-button"
              icon="notifications-outline"
              iconColor={COLORS.brandOrange}
              label="Notifications"
              hint="Push alerts, email, SMS preferences"
              onPress={() => router.push('/settings/notifications')}
            />
            <MenuItem
              testID="profile-edit-button"
              icon="person-outline"
              iconColor={COLORS.accent}
              label="Edit Profile"
              hint="Display name and phone"
              onPress={() => router.push('/settings/edit-profile')}
            />
            <MenuItem
              testID="profile-change-email-button"
              icon="mail-outline"
              iconColor={COLORS.brandOrange}
              label="Change Email"
              hint="Update the email address used to sign in"
              onPress={() => router.push('/settings/change-email')}
            />

            {/* Role access — single-role users see a one-tap action.
                Multi-role users have RoleSwitcher above, so these MenuItems
                are hidden to avoid redundancy. */}
            {(roles?.length || 0) <= 1 && hasTenantRole && (
              <MenuItem
                testID="profile-switch-to-renter-button"
                icon="home-outline"
                iconColor={COLORS.logoOrange}
                label="Switch to Renter view"
                hint="Swipe rentals and message owners"
                onPress={() => performRoleSwitch({ targetRole: 'tenant', session, switchRole, router })}
              />
            )}
            {!hasTenantRole && (
              <MenuItem
                testID="profile-add-role-button"
                icon="home-outline"
                iconColor={COLORS.logoOrange}
                label="Browse Rentals as a Renter too"
                hint="Add the renter role to swipe and save homes"
                onPress={() => router.push('/settings/add-role')}
              />
            )}

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ACCOUNT</Text>

            {/* Sign Out */}
            <TouchableOpacity testID="profile-sign-out-button" style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="profile-delete-account-link" style={styles.deleteLink} onPress={() => router.push('/settings/delete-account')}>
              <Text style={styles.deleteLinkText}>Delete Account</Text>
            </TouchableOpacity>
          </>
        )}

        <EqualHousingBadge style={{ marginTop: 20, marginBottom: 10 }} />
      </ScrollView>

      <AuthBottomSheet
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        context="owner_profile"
      />
    </SafeAreaView>
  );
}

/** Reusable menu item with icon + chevron */
function MenuItem({ icon, iconColor, label, hint, onPress, testID }) {
  return (
    <TouchableOpacity testID={testID} style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, { backgroundColor: (iconColor || COLORS.accent) + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor || COLORS.accent} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        {hint && <Text style={styles.menuHint}>{hint}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.slate} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: LAYOUT.padding.md,
    paddingBottom: 40,
  },
  // ── Hero header ──────────────────────────
  heroHeader: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.lg,
    marginBottom: LAYOUT.padding.sm,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.white,
    letterSpacing: 1,
  },
  heroName: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginBottom: 2,
  },
  heroRole: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
  },
  // ── Sign in card (anon) — full art treatment, primary conversion moment ──
  signInCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: LAYOUT.padding.md,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,180,80,0.4)',
  },
  signInGradient: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  signInShine: {
    ...StyleSheet.absoluteFillObject,
    bottom: '50%',
  },
  signInInnerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  signInBottomEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
  signInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signInIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  signInTextWrap: {
    flex: 1,
  },
  signInHeadline: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  signInCaption: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
  // ── Section labels ───────────────────────
  sectionLabel: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: LAYOUT.padding.sm,
    marginTop: LAYOUT.padding.md,
    marginLeft: 4,
  },
  // ── Menu items ───────────────────────────
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  menuHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 2,
  },
  // ── Sign out ─────────────────────────────
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '44',
    backgroundColor: COLORS.danger + '0A',
  },
  signOutText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.danger,
  },
  deleteLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteLinkText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    textDecorationLine: 'underline',
  },
});
