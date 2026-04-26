import { hasOnboarded, getUserRole, saveUserRole, hasSelectedRole } from './storage';
import { supabase } from './supabase';

/**
 * Resolve the correct post-login destination based on user role and
 * onboarding status. Used by index.js, password.js, auth-callback.js, and
 * onboarding.js.
 *
 * Role source of truth: profiles.role (DB) → knownRole param → AsyncStorage → 'tenant'
 *
 * Renter post-auth onboarding (added 2026-04-25):
 *   When a renter authenticates and is missing display_name, interpose the
 *   /settings/edit-profile screen with ?firstTime=true and ?next=<intended>
 *   so we capture name (required) + phone (optional) before they continue.
 *   `about-you.js` and `/onboarding` are no longer used for renters.
 *
 *   Owner-side onboarding has its own flow (different fields, different
 *   gate moments) and is NOT touched by this function — owners route
 *   straight to /(owner)/home as today. A future owner-flow trace will
 *   decide what (if anything) to interpose for owners.
 *
 * @param {object} session - Supabase auth session (may be anonymous)
 * @param {string} [knownRole] - Pre-resolved role (from AuthProvider context or login params).
 * @param {string} [intendedDest] - Optional original destination (e.g. from
 *   `auth_return_to` AsyncStorage). When set, becomes the `?next=` param if
 *   we interpose Edit Profile, or the direct return value if no interposition.
 */
export async function resolvePostLoginDestination(session, knownRole, intendedDest) {
  // No session at all — check if user has ever selected a role
  if (!session) {
    const roleSelected = await hasSelectedRole();
    if (!roleSelected) return '/welcome';

    // Role was selected but no session — this means renter in anonymous mode
    // The index.js will handle creating anonymous session
    const role = await getUserRole();
    if (role === 'owner') return '/(owner)/home'; // anonymous owners browse listings
    return '/(tenant)/swipe'; // renters go to feed
  }

  // Has session — resolve role
  let role = knownRole;
  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    role = profile?.role;
  }
  if (!role) {
    role = await getUserRole();
  }
  role = role || 'tenant';

  // Cache to AsyncStorage
  const localRole = await getUserRole();
  if (role !== localRole) {
    await saveUserRole(role);
  }

  // Owners — straight to home today; owner-side post-auth onboarding is
  // not in scope of the renter redesign. Don't add owner interposition
  // here without a separate owner-flow analysis (per Chris 2026-04-25).
  if (role === 'owner') {
    return intendedDest || '/(owner)/home';
  }

  // Renters: default destination is the swipe feed unless an intent was
  // stashed by the auth-trigger screen (e.g. "send first message to listing X").
  const renterDest = intendedDest || '/(tenant)/swipe';

  // Anonymous renter sessions never need name/phone — they route straight.
  if (session.user?.is_anonymous) return renterDest;

  // Authenticated renter — check display_name. If missing, interpose Edit
  // Profile so we capture name (required) + phone (optional) before they
  // resume their original intent.
  return await maybeInterposeFirstTimeProfile(session.user.id, renterDest);
}

/**
 * Renter-only post-auth interposition: if the authenticated user has no
 * display_name on their profile, return a path to the Edit Profile screen
 * with `firstTime=true` (changes the header copy) and `next=<intendedDest>`
 * (where Edit Profile sends them after save). Otherwise return intendedDest.
 *
 * Called only for non-anonymous renter sessions.
 */
async function maybeInterposeFirstTimeProfile(userId, intendedDest) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();

    const hasName = (profile?.display_name || '').trim().length > 0;
    if (hasName) return intendedDest;

    const next = encodeURIComponent(intendedDest);
    return `/settings/edit-profile?firstTime=true&next=${next}`;
  } catch {
    // If the profile read fails for any reason, don't block the user —
    // route them to the intended destination. They can always edit
    // their profile later from the Profile tab.
    return intendedDest;
  }
}
