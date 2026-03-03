import { hasOnboarded, getUserRole, saveUserRole } from './storage';

/**
 * Resolve the correct post-login destination based on user role and onboarding status.
 * Used by index.js, password.js, auth-callback.js, and onboarding.js.
 *
 * Always persists the resolved role to AsyncStorage so cold starts work reliably.
 * Gates users without a display_name through the /about-you screen first.
 */
export async function resolvePostLoginDestination(session) {
  if (!session) return '/welcome';

  const metadataRole = session.user?.user_metadata?.role;
  const localRole = await getUserRole();
  const role = metadataRole || localRole || 'tenant';

  // Persist to AsyncStorage so every future cold start knows the role
  if (role !== localRole) {
    await saveUserRole(role);
  }

  // Require name before entering the app
  const displayName = session.user?.user_metadata?.display_name;
  if (!displayName || !displayName.includes(' ')) {
    return '/about-you';
  }

  if (role === 'owner') return '/(owner)/listings';

  const onboarded = await hasOnboarded();
  return onboarded ? '/(tenant)/swipe' : '/onboarding';
}
