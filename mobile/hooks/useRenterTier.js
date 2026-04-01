import { useState, useEffect, useCallback, useContext } from 'react';
import { useFocusEffect } from 'expo-router';
import { AuthContext } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

/**
 * Renter Tier hook — manages Ask Pad Explorer / Pad Master tier state.
 * Separate from owner tiers (profiles.tier column untouched).
 *
 * Tiers:
 *   free       → 1 zone, 5 Ask Pad queries/day
 *   explorer   → 2 zones, 30 queries/day + monthly rollover (cap 900)
 *   master     → 3 zones, unlimited queries, Verified Renter badge
 */

const TIER_CONFIG = {
  free: { label: 'Free', dailyQueries: 5, maxZones: 1, earnBonus: 1.0 },
  explorer: { label: 'AskPad Explorer', dailyQueries: 30, maxZones: 2, earnBonus: 1.2 },
  master: { label: 'Pad Master', dailyQueries: 999, maxZones: 3, earnBonus: 1.2 },
};

export { TIER_CONFIG };

export default function useRenterTier() {
  const { user } = useContext(AuthContext);
  const [tier, setTier] = useState('free');
  const [verified, setVerified] = useState(false);
  const [zones, setZones] = useState(1);
  const [queriesToday, setQueriesToday] = useState(null);
  const [queriesRollover, setQueriesRollover] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('renter_tier, verified_renter, search_zones_count, agent_queries_today, agent_queries_rollover, agent_queries_reset_date, agent_cooldown_until')
        .eq('id', user.id)
        .single();

      if (data) {
        // Daily reset — if last reset was before today, counter is stale
        const today = new Date().toISOString().split('T')[0];
        const lastReset = data.agent_queries_reset_date;
        let queriesTodayValue = data.agent_queries_today || 0;

        if (!lastReset || lastReset < today) {
          queriesTodayValue = 0;
          // Persist the reset
          await supabase.from('profiles').update({
            agent_queries_today: 0,
            agent_queries_reset_date: today,
          }).eq('id', user.id);
        }

        setTier(data.renter_tier || 'free');
        setVerified(data.verified_renter || false);
        setZones(data.search_zones_count || 1);
        setQueriesToday(queriesTodayValue);
        setQueriesRollover(data.agent_queries_rollover || 0);
        setCooldownUntil(data.agent_cooldown_until);
      }
      setLoading(false);
    })();
  }, [user]);

  // Auto-refresh when screen gains focus (e.g., returning from chat or other tabs)
  useFocusEffect(
    useCallback(() => {
      if (user && !loading) refresh();
    }, [user, loading])
  );

  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;

  const remainingQueries = useCallback(() => {
    if (queriesToday === null) return null; // still loading
    if (tier === 'master') return 999;
    const daily = config.dailyQueries - queriesToday;
    return Math.max(0, daily) + queriesRollover;
  }, [tier, config, queriesToday, queriesRollover]);

  const canQuery = useCallback(() => {
    if (queriesToday === null) return false; // still loading — block queries
    // Check cooldown
    if (cooldownUntil && new Date(cooldownUntil) > new Date()) return false;
    return remainingQueries() > 0;
  }, [queriesToday, cooldownUntil, remainingQueries]);

  const isVerified = useCallback(() => verified, [verified]);

  const cooldownMinutes = useCallback(() => {
    if (!cooldownUntil) return 0;
    const diff = new Date(cooldownUntil) - new Date();
    return Math.max(0, Math.ceil(diff / 60000));
  }, [cooldownUntil]);

  // Refresh tier data from DB
  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('renter_tier, verified_renter, search_zones_count, agent_queries_today, agent_queries_rollover, agent_cooldown_until')
      .eq('id', user.id)
      .single();
    if (data) {
      setTier(data.renter_tier || 'free');
      setVerified(data.verified_renter || false);
      setZones(data.search_zones_count || 1);
      setQueriesToday(data.agent_queries_today || 0);
      setQueriesRollover(data.agent_queries_rollover || 0);
      setCooldownUntil(data.agent_cooldown_until);
    }
  }, [user]);

  return {
    tier,
    tierLabel: config.label,
    verified,
    zones,
    maxZones: config.maxZones,
    queriesToday,
    queriesRollover,
    dailyLimit: config.dailyQueries,
    earnBonus: config.earnBonus,
    remainingQueries: remainingQueries(),
    canQuery: canQuery(),
    isVerified: isVerified(),
    cooldownMinutes: cooldownMinutes(),
    loading,
    refresh,
  };
}
