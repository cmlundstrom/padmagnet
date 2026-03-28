import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

/**
 * PadPoints hook — manages PadPoints, PadLevel, and streaks.
 * Reads from profiles table, provides methods to earn points.
 * Works for both anonymous and signed-in users.
 */

const LEVELS = [
  { level: 1, name: 'Starter', xpRequired: 0 },
  { level: 2, name: 'Pad Explorer', xpRequired: 80 },
  { level: 3, name: 'Pad Hunter', xpRequired: 200 },
  { level: 4, name: 'Pad Expert', xpRequired: 500 },
  { level: 5, name: 'Pad Master', xpRequired: 1000 },
];

const PADPOINTS = {
  rightSwipe: 5,
  rightSwipeHighMatch: 8,   // 80+ PadScore
  leftSwipe: 2,
  preferenceFilled: 15,
  allPreferencesBonus: 25,
  firstMessage: 25,
  dailyOpen: 10,
  weeklyStreakBonus: 50,
  share: 5,
};

export function getLevelForPoints(points) {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.xpRequired) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(points) {
  for (const level of LEVELS) {
    if (points < level.xpRequired) return level;
  }
  return null; // max level
}

export function getProgressToNextLevel(points) {
  const current = getLevelForPoints(points);
  const next = getNextLevel(points);
  if (!next) return 1; // max level
  const range = next.xpRequired - current.xpRequired;
  const progress = points - current.xpRequired;
  return range > 0 ? progress / range : 1;
}

export { PADPOINTS, LEVELS };

export default function usePadPoints() {
  const { user } = useContext(AuthContext);
  const [padpoints, setPadpoints] = useState(0);
  const [padlevel, setPadlevel] = useState(1);
  const [streakDays, setStreakDays] = useState(0);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastEarned, setLastEarned] = useState(null); // { amount, reason } for animation

  // Load from profiles
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from('profiles')
      .select('padpoints, padlevel, streak_days, badges')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPadpoints(data.padpoints || 0);
          setPadlevel(data.padlevel || 1);
          setStreakDays(data.streak_days || 0);
          setBadges(data.badges || []);
        }
        setLoading(false);
      });
  }, [user]);

  // Earn PadPoints — updates local state immediately + persists to DB
  const earnPoints = useCallback(async (amount, reason) => {
    if (!user || amount <= 0) return null;

    const newTotal = padpoints + amount;
    const newLevel = getLevelForPoints(newTotal);
    const leveledUp = newLevel.level > padlevel;

    // Update local state immediately (optimistic)
    setPadpoints(newTotal);
    if (leveledUp) setPadlevel(newLevel.level);
    setLastEarned({ amount, reason, leveledUp, newLevel: leveledUp ? newLevel : null });

    // Persist to DB
    await supabase
      .from('profiles')
      .update({
        padpoints: newTotal,
        padlevel: newLevel.level,
      })
      .eq('id', user.id);

    // Clear lastEarned after animation time
    setTimeout(() => setLastEarned(null), 2000);

    return { newTotal, leveledUp, newLevel: leveledUp ? newLevel : null };
  }, [user, padpoints, padlevel]);

  // Check and update streak on app open
  const checkStreak = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('profiles')
      .select('streak_days, streak_last_date')
      .eq('id', user.id)
      .single();

    if (!data) return;

    const lastDate = data.streak_last_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (lastDate === today) {
      // Already checked in today
      setStreakDays(data.streak_days);
      return { streakDays: data.streak_days, isNew: false };
    }

    let newStreak;
    if (lastDate === yesterday) {
      newStreak = data.streak_days + 1;
    } else {
      newStreak = 1; // streak reset
    }

    await supabase
      .from('profiles')
      .update({ streak_days: newStreak, streak_last_date: today })
      .eq('id', user.id);

    setStreakDays(newStreak);

    // Earn daily open PadPoints
    await earnPoints(PADPOINTS.dailyOpen, 'Daily check-in');

    // Weekly streak bonus
    if (newStreak > 0 && newStreak % 7 === 0) {
      await earnPoints(PADPOINTS.weeklyStreakBonus, '7-day streak bonus');
    }

    return { streakDays: newStreak, isNew: true };
  }, [user, earnPoints]);

  return {
    padpoints,
    padlevel,
    streakDays,
    badges,
    loading,
    lastEarned,
    earnPoints,
    checkStreak,
    level: getLevelForPoints(padpoints),
    nextLevel: getNextLevel(padpoints),
    progress: getProgressToNextLevel(padpoints),
  };
}
