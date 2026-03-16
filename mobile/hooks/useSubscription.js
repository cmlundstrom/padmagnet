import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { getTierFeatures } from '../constants/tiers';

/**
 * Hook for subscription tier status and feature gating.
 * Reads tier from the user's profile (set by Stripe webhook or admin).
 * During "Founding Owner" period (Day 1-90), all features are free.
 *
 * Note: useAuth exposes { session, user, role, loading } but not the full
 * profile object, so we fetch the tier column from profiles directly.
 */
export function useSubscription() {
  const { user } = useAuth();
  const [tier, setTier] = useState('free');

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.tier) setTier(data.tier);
      });
  }, [user?.id]);

  const features = getTierFeatures(tier);

  return {
    tier,
    tierLabel: tier === 'free' ? 'Starter' : tier === 'pro' ? 'Pro' : 'Premium',
    ...features,
  };
}
