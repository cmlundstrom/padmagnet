// Shared role switch helper. Used by:
//   - RoleSwitcher (dual-role users toggling from Profile)
//   - Profile "Switch to Owner/Renter view" CTAs (single-role users whose
//     current tab group differs from their profiles.role — e.g. a user with
//     roles=['owner'] browsing the renter tab group)
//
// Does the full dance: local state, AsyncStorage cache, profiles.role PATCH,
// and navigation. Kept DRY so the two call sites can't drift.

export async function performRoleSwitch({ targetRole, session, switchRole, router }) {
  // 1. Local state + AsyncStorage cache so the next render reflects the
  //    new role and a future switch-back works.
  await switchRole(targetRole);

  // 2. Persist to profiles.role via direct REST so the choice survives
  //    sign-out + sign-in (AuthProvider.resolveRole reads profiles.role on
  //    mount and would otherwise override the AsyncStorage cache).
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
      console.error('[roleSwitch] persist role failed:', err.message);
    }
  }

  // 3. Navigate to target tab group.
  if (targetRole === 'owner') {
    router.replace('/(owner)/home');
  } else {
    router.replace('/(tenant)/swipe');
  }
}
