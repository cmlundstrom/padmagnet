import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from '../../lib/auth';
import RoleSwitcher from '../../components/auth/RoleSwitcher';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import { performRoleSwitch } from '../../lib/role-switch';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import usePadPoints from '../../hooks/usePadPoints';
import { useAlert } from '../../providers/AlertProvider';
import { supabase } from '../../lib/supabase';
import ProfileCard from '../../components/screens/ProfileCard';
import { PadScoreDashboard } from '../../components/padpoints';
import { TierCard, TierUpgradeSheet } from '../../components/tiers';
import useRenterTier from '../../hooks/useRenterTier';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { EqualHousingBadge } from '../../components/ui';

export default function TenantProfileScreen() {
  const { user, session, role, roles, isAnon, switchRole } = useAuth();
  const alert = useAlert();
  const hasOwnerRole = (roles || []).includes('owner');
  const [profile, setProfile] = useState({});
  const padPoints = usePadPoints();
  const renterTier = useRenterTier();
  const [showUpgrade, setShowUpgrade] = useState(false);
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
      const interval = setInterval(fetchProfile, 3000);
      return () => clearInterval(interval);
    }, [fetchProfile])
  );

  async function handleSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  function handleResetSwipes() {
    alert(
      'Reset Swipe History',
      'This will reset all your liked and passed listings. They\'ll reappear in your swipe deck.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiFetch('/api/swipes/reset', { method: 'DELETE' });
              alert('Done', `${result.deleted} swipe${result.deleted === 1 ? '' : 's'} reset. Your deck will refresh.`);
            } catch (err) {
              alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  // Initials for avatar
  const initials = (profile.display_name || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const tierColor = renterTier.tier === 'master' ? COLORS.gold
    : renterTier.tier === 'explorer' ? COLORS.brandOrange
    : COLORS.accent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero header — avatar + name */}
        <View style={styles.heroHeader}>
          <View style={[styles.avatar, { borderColor: tierColor }]}>
            <LinearGradient
              colors={renterTier.tier === 'master' ? ['#FFD700', '#C4A030'] : renterTier.tier === 'explorer' ? ['#FF8C42', '#C94A1E'] : ['#3B82F6', '#2563EB']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.heroName}>{profile.display_name || 'Set Your Name'}</Text>
          <Text style={styles.heroRole}>Renter</Text>
        </View>

        {/* Role switcher — renders null for single-role users, so it only
            appears for dual-role accounts. Above the fold so a renter can
            flip to owner (or back) without scrolling past PadScore + tier. */}
        <RoleSwitcher />

        {/* Anonymous value pitch — hero CTA above PadScore. Full art treatment
            (5-stop orange gradient + shine + inner glow + warm shadow) matches
            the Enable Location L2 button; this is the primary conversion
            moment and should read as the hottest element on the screen. */}
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
                  <Ionicons name="lock-open-outline" size={20} color={COLORS.white} />
                </View>
                <View style={styles.signInTextWrap}>
                  <Text style={styles.signInHeadline}>Save Your Matches</Text>
                  <Text style={styles.signInCaption}>
                    Message owners, sync across devices, personalize your search.
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

        {/* PadScore Dashboard — the hero of the profile */}
        <PadScoreDashboard
          padpoints={padPoints.padpoints}
          level={padPoints.level}
          progress={padPoints.progress}
          nextLevel={padPoints.nextLevel}
          streakDays={padPoints.streakDays}
          badges={padPoints.badges}
        />

        {/* Tier status + Ask Pad */}
        <TierCard
          tier={renterTier.tier}
          tierLabel={renterTier.tierLabel}
          verified={renterTier.verified}
          queriesToday={renterTier.queriesToday}
          dailyLimit={renterTier.dailyLimit}
          remainingQueries={renterTier.remainingQueries}
          zones={renterTier.zones}
          maxZones={renterTier.maxZones}
          onUpgrade={() => setShowUpgrade(true)}
        />

        {/* Profile card — only for authenticated users. Read-only display. */}
        {!isAnon && (
          <ProfileCard
            displayName={profile.display_name}
            email={profile.email}
            phone={profile.phone}
          />
        )}

        {/* Settings — preferences/notifications stay visible for anon to
            give them a sense of what authenticated experience looks like.
            Account-editing items are gated behind !isAnon. */}
        <Text style={styles.sectionLabel}>SETTINGS</Text>

        <MenuItem
          testID="profile-preferences-button"
          icon="options-outline"
          iconColor={COLORS.accent}
          label="Tune Your PadScore"
          hint="Budget, location, property type, pets, features"
          onPress={() => router.push('/settings/preferences')}
        />
        <MenuItem
          testID="profile-notifications-button"
          icon="notifications-outline"
          iconColor={COLORS.brandOrange}
          label="Notifications"
          hint="Push alerts, email, new listing matches"
          onPress={() => router.push('/settings/notifications')}
        />

        {/* Account-editing items — authed only. Anon users would crash trying
            to edit fields keyed on user.id. */}
        {!isAnon && (
          <>
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
          </>
        )}

        {/* Role access — show "Switch to Owner view" when the user already
            holds the owner role, or "Become an Owner too" when they don't.
            Signed-in users only (anon users sign in first). */}
        {!isAnon && hasOwnerRole && (
          <MenuItem
            testID="profile-switch-to-owner-button"
            icon="key-outline"
            iconColor={COLORS.accent}
            label="Switch to Owner view"
            hint="Manage your listings and renter inquiries"
            onPress={() => performRoleSwitch({ targetRole: 'owner', session, switchRole, router })}
          />
        )}
        {!isAnon && !hasOwnerRole && (
          <MenuItem
            testID="profile-add-role-button"
            icon="key-outline"
            iconColor={COLORS.brandOrange}
            label="Become an Owner too"
            hint="Add the owner role to list your own property"
            onPress={() => router.push('/settings/add-role')}
          />
        )}

        {/* Account section */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ACCOUNT</Text>

        <MenuItem
          icon="refresh-outline"
          iconColor={COLORS.danger}
          label="Reset Swipe History"
          hint="Clear all saved and passed listings"
          onPress={handleResetSwipes}
          danger
        />

        {/* Sign Out — visible always (anon can sign out of anon session) */}
        <TouchableOpacity testID="profile-sign-out-button" style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete account — authed only */}
        {!isAnon && (
          <TouchableOpacity testID="profile-delete-account-link" style={styles.deleteLink} onPress={() => router.push('/settings/delete-account')}>
            <Text style={styles.deleteLinkText}>Delete Account</Text>
          </TouchableOpacity>
        )}

        <EqualHousingBadge style={{ marginTop: 16, marginBottom: 10 }} />
      </ScrollView>

      <AuthBottomSheet
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        context="tenant_profile"
        padpoints={padPoints.padpoints}
      />

      {/* Tier Upgrade Sheet */}
      <TierUpgradeSheet
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentTier={renterTier.tier}
        padpoints={padPoints.padpoints}
        onBuyExplorer={async () => {
          try {
            const result = await apiFetch('/api/renter-tier/checkout', {
              method: 'POST',
              body: JSON.stringify({ tier: 'explorer' }),
            });
            if (result.checkout_url) {
              const { Linking } = require('react-native');
              Linking.openURL(result.checkout_url);
            }
            setShowUpgrade(false);
          } catch (err) {
            alert('Error', err.message);
          }
        }}
        onBuyMaster={async () => {
          try {
            const result = await apiFetch('/api/renter-tier/checkout', {
              method: 'POST',
              body: JSON.stringify({ tier: 'master' }),
            });
            if (result.checkout_url) {
              const { Linking } = require('react-native');
              Linking.openURL(result.checkout_url);
            }
            setShowUpgrade(false);
          } catch (err) {
            alert('Error', err.message);
          }
        }}
        onRedeemExplorer={async () => {
          try {
            await apiFetch('/api/renter-tier/redeem', { method: 'POST' });
            renterTier.refresh();
            padPoints.checkStreak();
            setShowUpgrade(false);
            alert('Upgraded!', 'Welcome to AskPad Explorer! You now have 30 daily queries and 2 search zones.');
          } catch (err) {
            alert('Error', err.message);
          }
        }}
      />
    </SafeAreaView>
  );
}

/** Reusable menu item with icon + chevron */
function MenuItem({ icon, iconColor, label, hint, onPress, danger, testID }) {
  return (
    <TouchableOpacity testID={testID} style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconWrap, { backgroundColor: (iconColor || COLORS.accent) + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor || COLORS.accent} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
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
    // Glow
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
    // Subtle elevation
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
  // ── Delete account ───────────────────────
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
