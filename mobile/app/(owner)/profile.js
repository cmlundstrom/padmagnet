import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from '../../lib/auth';
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
  const { session, user, role } = useAuth();
  const isAnon = session?.user?.is_anonymous === true;
  const { tier } = useSubscription();
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

        {/* Anonymous value pitch */}
        {isAnon && (
          <TouchableOpacity style={styles.signInCard} onPress={() => setShowAuth(true)} activeOpacity={0.7}>
            <Ionicons name="lock-open-outline" size={20} color={COLORS.accent} />
            <Text style={styles.signInCardText}>
              Sign in to manage listings, connect with renters, and track your rental performance.
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}

        {/* Sign out — always visible for testing */}
        {isAnon && (
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Profile card — only for authenticated */}
        {!isAnon && (
          <ProfileCard
            role={role}
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
              icon="card-outline"
              iconColor={COLORS.accent}
              label="Subscription & Billing"
              hint="Manage your plan and payment history"
              onPress={() => router.push('/settings/subscription')}
            />
            <MenuItem
              icon="notifications-outline"
              iconColor={COLORS.brandOrange}
              label="Notifications"
              hint="Push alerts, email, SMS preferences"
              onPress={() => router.push('/settings/notifications')}
            />
            <MenuItem
              icon="person-outline"
              iconColor={COLORS.accent}
              label="Edit Profile"
              hint="Name, email, phone"
              onPress={() => router.push('/settings/edit-profile')}
            />

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ACCOUNT</Text>

            {/* Sign Out */}
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteLink} onPress={() => router.push('/settings/delete-account')}>
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
function MenuItem({ icon, iconColor, label, hint, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
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
  // ── Sign in card (anon) ──────────────────
  signInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.accent + '12',
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
  },
  signInCardText: {
    flex: 1,
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
