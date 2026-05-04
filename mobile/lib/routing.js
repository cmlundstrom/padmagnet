import { hasOnboarded, getUserRole, saveUserRole, hasSelectedRole } from './storage';
import { supabase } from './supabase';

/**
 * Resolve the correct post-login destination based on user role and
 * onboarding status. Used by index.js, password.js, auth-callback.js, and
 * onboarding.js.
 *
 * Role source of truth: profiles.role (DB) → knownRole param → AsyncStorage → 'tenant'
 *
 * First-time post-auth onboarding (added 2026-04-25 for renters, extended
 * to owners 2026-05-03):
 *   When an authenticated user is missing display_name, interpose the
 *   /settings/edit-profile screen with ?firstTime=true and ?next=<intended>
 *   so we capture name (required) + phone (optional) before they continue.
 *   Applies to BOTH renters and owners — the screen is role-aware via
 *   useAuth() and renders contextually appropriate copy. Anonymous sessions
 *   (either role) skip interposition since they have no profile to update.
 *   `about-you.js` and `/onboarding` are no longer used.
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

  // Role-specific default destination — falls back to home/swipe when no
  // explicit intent was stashed by the auth-trigger screen.
  const defaultDest = role === 'owner' ? '/(owner)/home' : '/(tenant)/swipe';
  const finalDest = intendedDest || defaultDest;

  // Anonymous sessions skip interposition — they have no profile to update.
  if (session.user?.is_anonymous) return finalDest;

  // Authenticated user (either role) — check display_name. If missing,
  // interpose Edit Profile so we capture name (required) + phone (optional)
  // before they resume their original intent.
  return await maybeInterposeFirstTimeProfile(session.user.id, finalDest);
}

/**
 * Post-auth interposition: if the authenticated user has no display_name
 * on their profile, return a path to the Edit Profile screen with
 * `firstTime=true` (changes the header copy) and `next=<intendedDest>`
 * (where Edit Profile sends them after save). Otherwise return intendedDest.
 *
 * Applies to both renter and owner roles. The Edit Profile screen renders
 * role-aware copy via useAuth().
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
