import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { getTierFeatures } from '../constants/tiers';

/**
 * Hook for subscription tier status and feature gating.
 * Reads tier + expiry from the user's profile (set by Stripe webhook or admin).
 * Call refresh() to re-fetch after a purchase.
 */
export function useSubscription() {
  const { user } = useAuth();
  const [tier, setTier] = useState('free');
  const [tierExpiresAt, setTierExpiresAt] = useState(null);
  const [tierStartedAt, setTierStartedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTier = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('tier, tier_expires_at, tier_started_at')
      .eq('id', user.id)
      .single();
    if (data?.tier) setTier(data.tier);
    if (data?.tier_expires_at) setTierExpiresAt(data.tier_expires_at);
    if (data?.tier_started_at) setTierStartedAt(data.tier_started_at);
  }, [user?.id]);

  useEffect(() => {
    fetchTier();
  }, [fetchTier, refreshKey]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // Calculate days remaining
  let daysRemaining = null;
  if (tierExpiresAt) {
    const now = new Date();
    const expires = new Date(tierExpiresAt);
    daysRemaining = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)));
  }

  const features = getTierFeatures(tier);

  return {
    tier,
    tierLabel: tier === 'free' ? 'Starter' : tier === 'pro' ? 'Pro' : 'Premium',
    tierExpiresAt,
    tierStartedAt,
    daysRemaining,
    isExpired: daysRemaining !== null && daysRemaining <= 0,
    refresh,
    ...features,
  };
}
