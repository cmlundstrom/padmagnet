import { hasOnboarded, getUserRole, saveUserRole } from './storage';

/**
 * Resolve the correct post-login destination based on user role and onboarding status.
 * Used by index.js, password.js, auth-callback.js, and onboarding.js.
 *
 * @param {object} session - Supabase auth session
 * @param {string} [knownRole] - Pre-resolved role (from AuthProvider context or login params).
 *                                Avoids relying on potentially stale session metadata.
 */
export async function resolvePostLoginDestination(session, knownRole) {
  if (!session) return '/welcome';

  const metadataRole = session.user?.user_metadata?.role;
  const localRole = await getUserRole();
  const role = knownRole || metadataRole || localRole || 'tenant';

  // Persist to AsyncStorage so every future cold start knows the role
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
