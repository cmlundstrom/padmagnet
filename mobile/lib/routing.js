import { hasOnboarded, getUserRole, saveUserRole } from './storage';
import { supabase } from './supabase';

/**
 * Resolve the correct post-login destination based on user role and onboarding status.
 * Used by index.js, password.js, auth-callback.js, and onboarding.js.
 *
 * Role source of truth: profiles.role (DB) → knownRole param → AsyncStorage → 'tenant'
 *
 * @param {object} session - Supabase auth session
 * @param {string} [knownRole] - Pre-resolved role (from AuthProvider context or login params).
 */
export async function resolvePostLoginDestination(session, knownRole) {
  if (!session) return '/welcome';

  // Resolve role: DB → knownRole → AsyncStorage → default
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

  // Require full name before entering the app
  const displayName = session.user?.user_metadata?.display_name;
  if (!displayName || !displayName.includes(' ')) {
    return '/about-you';
  }

  if (role === 'owner') return '/(owner)/listings';

  const onboarded = await hasOnboarded();
  return onboarded ? '/(tenant)/swipe' : '/onboarding';
}
