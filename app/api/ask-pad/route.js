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
CRITICAL: You MUST use the search_rentals tool to find listings. NEVER invent, fabricate, or guess addresses, prices, or property details. If the user asks about listings, ALWAYS call search_rentals first. Only reference data returned by your tools.

When presenting listings from search results, format each as:
- Address, City — $X,XXX/mo — Xbd/Xba — X,XXX sqft

If no results are found, say so honestly and suggest broadening the search.
Keep responses concise — 2-3 sentences max, then list the results. Be enthusiastic and helpful, like a friend who knows every listing in town.`;

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
      grokResponse = {
        type: 'text',
        message: '🔧 Ask Pad is being configured! Stay tuned.',
        placeholder: true,
      };
    } else {
      // Grok API call with function calling (tool use)
      grokResponse = await callGrokWithTools(supabase, user.id, query);
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

// ============================================================
// GROK FUNCTION CALLING — Tools + Execution
// ============================================================

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_rentals',
      description: 'Search PadMagnet MLS rental listings. Returns real listings with addresses, prices, and details. Always use this to find listings — never make up addresses or prices.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City to search in (e.g., "Stuart", "Palm City", "Jensen Beach")' },
          county: { type: 'string', description: 'County (e.g., "Martin County", "Palm Beach County")' },
          min_beds: { type: 'integer', description: 'Minimum bedrooms' },
          max_beds: { type: 'integer', description: 'Maximum bedrooms' },
          max_rent: { type: 'number', description: 'Maximum monthly rent in dollars' },
          min_rent: { type: 'number', description: 'Minimum monthly rent in dollars' },
          pets_allowed: { type: 'boolean', description: 'Filter for pet-friendly properties' },
          pool: { type: 'boolean', description: 'Filter for properties with a pool' },
          property_type: { type: 'string', description: 'Property type (e.g., "Single Family Residence", "Condo", "Townhouse", "Apartment")' },
          furnished: { type: 'boolean', description: 'Filter for furnished properties' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_market_stats',
      description: 'Get rental market statistics for a county or city. Returns median rents by property type, active listing count, and price ranges.',
      parameters: {
        type: 'object',
        properties: {
          county: { type: 'string', description: 'County name (e.g., "Martin County")' },
          city: { type: 'string', description: 'City name (optional, for more specific stats)' },
        },
      },
    },
  },
];

async function callGrokWithTools(supabase, userId, query) {
  var messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: query },
  ];

  try {
    // First call — Grok may respond directly or request tool calls
    var res = await fetch(XAI_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + XAI_API_KEY,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: messages,
        tools: TOOLS,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      console.error('Grok API error:', res.status, await res.text());
      return { type: 'error', message: 'Ask Pad hit a snag. Try again in a moment!' };
    }

    var data = await res.json();
    var choice = data.choices && data.choices[0];
    if (!choice) return { type: 'error', message: 'Ask Pad got an empty response.' };

    var assistantMessage = choice.message;

    // If no tool calls, return the text response directly
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return { type: 'text', message: assistantMessage.content || 'Ask Pad is thinking...' };
    }

    // Execute tool calls
    messages.push(assistantMessage);
    var listings = [];

    for (var i = 0; i < assistantMessage.tool_calls.length; i++) {
      var toolCall = assistantMessage.tool_calls[i];
      var toolName = toolCall.function.name;
      var toolArgs = {};
      try { toolArgs = JSON.parse(toolCall.function.arguments); } catch (e) { toolArgs = {}; }

      var toolResult;
      if (toolName === 'search_rentals') {
        toolResult = await executeSearchRentals(supabase, toolArgs);
        listings = toolResult.listings || [];
      } else if (toolName === 'get_market_stats') {
        toolResult = await executeMarketStats(supabase, toolArgs);
      } else {
        toolResult = { error: 'Unknown tool' };
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }

    // Second call — Grok now has the real data, formats the response
    var res2 = await fetch(XAI_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + XAI_API_KEY,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: messages,
        max_tokens: 600,
      }),
    });

    if (!res2.ok) {
      console.error('Grok follow-up error:', res2.status);
      return { type: 'error', message: 'Ask Pad hit a snag processing results.' };
    }

    var data2 = await res2.json();
    var finalContent = data2.choices && data2.choices[0] && data2.choices[0].message && data2.choices[0].message.content;

    return {
      type: listings.length > 0 ? 'listings' : 'text',
      message: finalContent || 'Here are your results!',
      listings: listings.length > 0 ? listings : null,
    };

  } catch (err) {
    console.error('Grok tool calling error:', err);
    return { type: 'error', message: 'Ask Pad is temporarily unavailable. Try again shortly!' };
  }
}

// ============================================================
// TOOL IMPLEMENTATIONS
// ============================================================

async function executeSearchRentals(supabase, args) {
  var query = supabase
    .from('listings')
    .select('id, listing_id, street_number, street_name, city, state_or_province, postal_code, county, property_sub_type, list_price, bedrooms_total, bathrooms_total, living_area, year_built, pets_allowed, pool, furnished, photos, days_on_market, status')
    .eq('is_active', true)
    .eq('status', 'active');

  if (args.city) query = query.ilike('city', args.city);
  if (args.county) query = query.ilike('county', args.county);
  if (args.min_beds) query = query.gte('bedrooms_total', args.min_beds);
  if (args.max_beds) query = query.lte('bedrooms_total', args.max_beds);
  if (args.max_rent) query = query.lte('list_price', args.max_rent);
  if (args.min_rent) query = query.gte('list_price', args.min_rent);
  if (args.pets_allowed === true) query = query.eq('pets_allowed', true);
  if (args.pool === true) query = query.eq('pool', true);
  if (args.furnished === true) query = query.eq('furnished', true);
  if (args.property_type) query = query.ilike('property_sub_type', '%' + args.property_type + '%');

  query = query.order('list_price', { ascending: true }).limit(5);

  var result = await query;
  var data = result.data || [];

  var listings = data.map(function(l) {
    var address = ((l.street_number || '') + ' ' + (l.street_name || '')).trim();
    return {
      id: l.id,
      mls: l.listing_id,
      address: address,
      city: l.city,
      state: l.state_or_province,
      zip: l.postal_code,
      type: l.property_sub_type,
      rent: l.list_price,
      beds: l.bedrooms_total,
      baths: l.bathrooms_total,
      sqft: l.living_area,
      yearBuilt: l.year_built,
      pets: l.pets_allowed,
      pool: l.pool,
      furnished: l.furnished,
      dom: l.days_on_market,
      photo: l.photos && l.photos[0] ? l.photos[0].url || l.photos[0] : null,
    };
  });

  return {
    count: listings.length,
    listings: listings,
    searchParams: args,
  };
}

async function executeMarketStats(supabase, args) {
  var query = supabase
    .from('listings')
    .select('list_price, property_sub_type, bedrooms_total, living_area')
    .eq('is_active', true)
    .eq('status', 'active');

  if (args.county) query = query.ilike('county', args.county);
  if (args.city) query = query.ilike('city', args.city);

  var result = await query;
  var data = result.data || [];

  if (data.length === 0) {
    return { message: 'No active listings found in this area.', count: 0 };
  }

  var prices = data.map(function(l) { return Number(l.list_price) || 0; }).filter(function(p) { return p > 0; });
  prices.sort(function(a, b) { return a - b; });

  var median = prices[Math.floor(prices.length / 2)] || 0;
  var min = prices[0] || 0;
  var max = prices[prices.length - 1] || 0;

  // Group by type
  var byType = {};
  data.forEach(function(l) {
    var t = l.property_sub_type || 'Unknown';
    if (!byType[t]) byType[t] = { count: 0, prices: [] };
    byType[t].count++;
    if (l.list_price) byType[t].prices.push(Number(l.list_price));
  });

  var typeStats = Object.keys(byType).map(function(type) {
    var p = byType[type].prices.sort(function(a, b) { return a - b; });
    return {
      type: type,
      count: byType[type].count,
      medianRent: p[Math.floor(p.length / 2)] || 0,
    };
  });

  return {
    area: args.city || args.county || 'Unknown',
    totalActive: data.length,
    medianRent: median,
    priceRange: { min: min, max: max },
    byPropertyType: typeStats,
  };
}
