/**
 * Ask Pad — Agentic AI Co-Pilot for Renters
 *
 * POST /api/ask-pad
 * Validates auth + tier + limits → pre-query classifier → calls Grok 4.1 Fast → returns response.
 * Placeholder until XAI_API_KEY is configured.
 *
 * Tools: query_bridge_mls, get_user_prefs_and_padscore, save_listing,
 *        remove_listing, draft_message_to_owner, update_search_zones,
 *        get_current_tier_and_limits
 */

import { createServiceClient } from '../../../lib/supabase';
import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../lib/auth-helpers';

export const dynamic = 'force-dynamic';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-4.1-fast';
const XAI_BASE_URL = 'https://api.x.ai/v1';

// Tier query limits
const TIER_LIMITS = { free: 5, explorer: 30, master: 999 };

// Pre-query classifier keywords
const RENTAL_KEYWORDS = [
  'rent', 'lease', 'apartment', 'house', 'home', 'condo', 'townhouse',
  'duplex', 'villa', 'bedroom', 'bed', 'bath', 'sqft', 'square',
  'pet', 'dog', 'cat', 'pool', 'garage', 'yard', 'fenced', 'furnished',
  'hoa', 'budget', 'price', 'afford', 'cheap', 'expensive', 'under',
  'neighborhood', 'area', 'zone', 'location', 'near', 'close',
  'commute', 'drive', 'walk', 'school', 'work',
  'available', 'move in', 'deposit', 'listing', 'padscore', 'padpoint',
  'match', 'score', 'owner', 'landlord', 'property', 'manager',
  'stuart', 'palm city', 'jensen', 'hobe', 'miami', 'fort lauderdale',
  'broward', 'palm beach', 'martin', 'st lucie', 'boca', 'delray',
  'jupiter', 'wellington', 'coral springs', 'pembroke', 'hollywood',
  'show me', 'find me', 'search', 'look for', 'any', 'what',
  'how much', 'how many', 'where', 'which', 'best', 'cheapest',
];

const HUMOROUS_REBUFFS = [
  "Haha, I'm great at finding you the perfect rental pad, but I'm not wired for random questions! Try '2-bed dog-friendly under $2800 in Miami' and I'll show you matches with live PadScore™.",
  "Nice try 😂 I'm the rental whisperer, not the science guy. What's your budget and vibe for the next place?",
  "I'm laser-focused on killer rentals and PadScores. Hit me with a housing question and I'll blow your mind!",
];

const SYSTEM_PROMPT = `You are Ask Pad — PadMagnet's Rental Intelligence Agent. You are ONLY allowed to answer questions about rental homes, PadScore™, listings, neighborhoods, budgets, pets, HOA rules, availability, tenant preferences, or commuting.
You have NO general knowledge and NO web search.
If the user asks anything off-topic (weather, jokes, science, current events, homework, opinions, "why is the sky blue?", etc.), respond with ONE of these humorous rebuffs and stop:
1. "Haha, I'm great at finding you the perfect rental pad, but I'm not wired for random questions! Try asking something like '2-bed dog-friendly under $2800 in Miami' and I'll show you matches with live PadScore™."
2. "Nice try 😂 I'm the rental whisperer, not the science guy. What's your budget and vibe for the next place?"
3. "I'm laser-focused on killer rentals and PadScores. Hit me with a housing question and I'll blow your mind!"
Never break character. Never say "I can help with that" for off-topic requests.
When searching for listings, always include the PadScore for each result. Recommend the highest-scoring matches first. If the user hasn't set preferences yet, suggest they answer a few questions to improve their PadScore accuracy.
Keep responses concise — 2-3 sentences max for text, followed by listing cards if applicable. Be enthusiastic and helpful about rentals, like a friend who knows every listing in town.`;

function isRentalRelated(query) {
  const lower = query.toLowerCase();
  return RENTAL_KEYWORDS.some(function(kw) { return lower.includes(kw); });
}

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) return NextResponse.json({ error: authError }, { status });

    const { query } = await request.json();
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch user tier + query state
    const { data: profile } = await supabase
      .from('profiles')
      .select('renter_tier, agent_queries_today, agent_queries_rollover, agent_abuse_score, agent_cooldown_until, is_anonymous')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const tier = profile.renter_tier || 'free';
    const dailyLimit = TIER_LIMITS[tier] || 5;

    // Check cooldown
    if (profile.agent_cooldown_until && new Date(profile.agent_cooldown_until) > new Date()) {
      const mins = Math.ceil((new Date(profile.agent_cooldown_until) - new Date()) / 60000);
      return NextResponse.json({
        type: 'cooldown',
        message: `You're in a brief cooldown. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`,
      });
    }

    // Check query limits (Master = unlimited)
    if (tier !== 'master') {
      const dailyRemaining = dailyLimit - (profile.agent_queries_today || 0);
      const totalRemaining = Math.max(0, dailyRemaining) + (profile.agent_queries_rollover || 0);
      if (totalRemaining <= 0) {
        return NextResponse.json({
          type: 'limit_reached',
          message: "You've used all your Ask Pad queries for today. Upgrade for more!",
          tier,
          dailyLimit,
        });
      }
    }

    // Pre-query classifier — zero Grok cost for off-topic
    if (!isRentalRelated(query)) {
      const abuseScore = (profile.agent_abuse_score || 0) + 1;
      const updates = { agent_abuse_score: abuseScore };

      if (abuseScore >= 2) {
        updates.agent_cooldown_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        updates.agent_abuse_score = 0; // will reset after cooldown
      }

      await supabase.from('profiles').update(updates).eq('id', user.id);

      const rebuff = HUMOROUS_REBUFFS[Math.floor(Math.random() * HUMOROUS_REBUFFS.length)];
      return NextResponse.json({
        type: 'rebuff',
        message: rebuff,
        abuseWarning: abuseScore >= 2 ? 'Whoa there! Taking a quick breather. Try again in about an hour with a rental question!' : null,
      });
    }

    // Reset abuse score on successful on-topic query
    if (profile.agent_abuse_score > 0) {
      await supabase.from('profiles').update({ agent_abuse_score: 0 }).eq('id', user.id);
    }

    // =============================================
    // CALL GROK 4.1 FAST (placeholder if no key)
    // =============================================
    let grokResponse;

    if (!XAI_API_KEY) {
      // Placeholder response until xAI key is configured
      grokResponse = {
        type: 'text',
        message: `🔧 Ask Pad is being configured! Your query: "${query}"\n\nOnce connected to Grok, I'll search ${tier === 'free' ? 'your local' : 'expanded'} listings and show you matches with live PadScore™. Stay tuned!`,
        placeholder: true,
      };
    } else {
      // Real Grok API call
      try {
        const res = await fetch(XAI_BASE_URL + '/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + XAI_API_KEY,
          },
          body: JSON.stringify({
            model: XAI_MODEL,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: query },
            ],
            max_tokens: 500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          grokResponse = {
            type: 'text',
            message: data.choices?.[0]?.message?.content || 'Ask Pad is thinking...',
          };
        } else {
          const errText = await res.text();
          console.error('Grok API error:', res.status, errText);
          grokResponse = {
            type: 'error',
            message: 'Ask Pad hit a snag. Try again in a moment!',
          };
        }
      } catch (err) {
        console.error('Grok API call failed:', err);
        grokResponse = {
          type: 'error',
          message: 'Ask Pad is temporarily unavailable. Try again shortly!',
        };
      }
    }

    // Increment query count (only on successful on-topic queries)
    if (grokResponse.type !== 'error') {
      const updates = { agent_queries_today: (profile.agent_queries_today || 0) + 1 };

      // For explorer tier: use rollover first if daily is exhausted
      if (tier === 'explorer' && (profile.agent_queries_today || 0) >= dailyLimit) {
        if ((profile.agent_queries_rollover || 0) > 0) {
          updates.agent_queries_rollover = profile.agent_queries_rollover - 1;
          updates.agent_queries_today = profile.agent_queries_today; // don't increment daily
        }
      }

      // End of day: unused daily queries roll over (explorer only, cap 900)
      // This is handled by a daily cron, not here

      await supabase.from('profiles').update(updates).eq('id', user.id);
    }

    return NextResponse.json({
      ...grokResponse,
      queriesUsed: (profile.agent_queries_today || 0) + 1,
      dailyLimit,
      tier,
    });
  } catch (err) {
    console.error('Ask Pad error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
