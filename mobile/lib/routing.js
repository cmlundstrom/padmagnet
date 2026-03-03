import { hasOnboarded, getUserRole } from './storage';

/**
 * Resolve the correct post-login destination based on user role and onboarding status.
 * Used by index.js, password.js, auth-callback.js, and onboarding.js.
 */
export async function resolvePostLoginDestination(session) {
  if (!session) return '/welcome';

  const role = session.user?.user_metadata?.role || await getUserRole();

  if (role === 'owner') return '/(owner)/listings';

  const onboarded = await hasOnboarded();
  return onboarded ? '/(tenant)/swipe' : '/onboarding';
}
