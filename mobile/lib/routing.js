import { hasOnboarded, getUserRole, saveUserRole, hasSelectedRole } from './storage';
import { supabase } from './supabase';

/**
 * Resolve the correct post-login destination based on user role and onboarding status.
 * Used by index.js, password.js, auth-callback.js, and onboarding.js.
 *
 * Role source of truth: profiles.role (DB) → knownRole param → AsyncStorage → 'tenant'
 *
 * RENTER REDESIGN: Anonymous renters go straight to swipe feed.
 * No /about-you, no /onboarding required for renters anymore.
 * Name is collected at first message send, preferences via Smart Prompt Cards.
 *
 * @param {object} session - Supabase auth session (may be anonymous)
 * @param {string} [knownRole] - Pre-resolved role (from AuthProvider context or login params).
 */
export async function resolvePostLoginDestination(session, knownRole) {
  // No session at all — check if user has ever selected a role
  if (!session) {
    const roleSelected = await hasSelectedRole();
    if (!roleSelected) return '/welcome';

    // Role was selected but no session — this means renter in anonymous mode
    // The index.js will handle creating anonymous session
    const role = await getUserRole();
    if (role === 'owner') return '/(owner)/listings'; // anonymous owners browse listings
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

  // Owners — anonymous owners go straight to listings, authenticated need name
  if (role === 'owner') {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('display_name, is_anonymous')
      .eq('id', session.user.id)
      .single();

    // Anonymous owners skip the name gate — browse freely
    if (ownerProfile?.is_anonymous) {
      return '/(owner)/listings';
    }

    // Authenticated owners need full name before entering
    const displayName = ownerProfile?.display_name || session.user?.user_metadata?.display_name;
    if (!displayName || !displayName.includes(' ')) {
      return '/about-you';
    }
    return '/(owner)/listings';
  }

  // Renters: straight to swipe feed (no onboarding wizard, no name gate)
  return '/(tenant)/swipe';
}
