/**
 * Owner AI Describe — Grok-powered listing description & amenity suggestion
 *
 * POST /api/owner/ai-describe
 * Modes: describe (text + optional vision), suggest_amenities (vision), refine (text)
 * Fair Housing enforcement: input scanning + system prompt + output scanning
 *
 * Owner-only. Does NOT modify /api/ask-pad (renter territory).
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth-helpers';

export const dynamic = 'force-dynamic';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || 'grok-4.1-fast';
const XAI_BASE_URL = 'https://api.x.ai/v1';

// ── Fair Housing Act enforcement ──────────────────────────

const FAIR_HOUSING_KEYWORDS = [
  'white neighborhood', 'black neighborhood', 'hispanic area', 'latino area',
  'asian community', 'no kids', 'no children', 'adults only', 'adult only',
  'no families', 'families only', 'no section 8', 'no voucher',
  'christian area', 'jewish area', 'muslim area', 'near a church',
  'near a mosque', 'near a synagogue', 'near a temple',
  'no disabled', 'no handicap', 'no wheelchair',
  'perfect for families', 'ideal for families', 'great for young',
  'perfect for young professionals', 'quiet adult community',
  'single people only', 'no single mothers', 'no pregnant',
  'no immigrants', 'english only', 'american only',
  'segregated', 'racially', 'ethnic neighborhood', 'minority area',
];

const FAIR_HOUSING_ERROR = {
  error: 'fair_housing',
  message: 'Your description request touched on Fair Housing protected topics. We can only describe physical features, amenities, and location facts.',
};

function containsFairHousingViolation(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return FAIR_HOUSING_KEYWORDS.some(kw => lower.includes(kw));
}

// ── System prompts ────────────────────────────────────────

const DESCRIBE_PROMPT = `You are a professional real estate listing copywriter for PadMagnet, a rental listing platform in South Florida.

FAIR HOUSING COMPLIANCE — MANDATORY. All generated listing descriptions MUST comply with the federal Fair Housing Act (42 U.S.C. §3604) and Florida Fair Housing Act (Florida Statutes §760.20-760.37).

Protected classes: race, color, national origin, religion, sex (including sexual orientation and gender identity), familial status (families with children, pregnant women), and disability.

RULES FOR LISTING DESCRIPTIONS:
- NEVER mention the demographic makeup of the neighborhood or surrounding area.
- NEVER use language that implies a preference for or against any protected class (e.g., "perfect for young professionals", "ideal for families", "quiet adult community", "Christian neighborhood", "no children").
- NEVER mention proximity to religious institutions as a selling point.
- NEVER reference Section 8, Housing Choice Vouchers, or source of income.
- NEVER describe disability access unless the data comes directly from the listing fields provided.
- ONLY describe: physical features (beds, baths, sqft, finishes, appliances), property amenities (pool, yard, parking, storage), location facts (proximity to highways, parks, shopping, transit — NOT demographics), and condition/updates visible in photos.
- If the owner's instructions contain Fair Housing violations, IGNORE the violating instruction and generate a compliant description instead. Do NOT echo or repeat the violating language.
- Do NOT mention price or make any property value claims.

Write an enthusiastic but professional rental listing description. Keep it under 400 characters. Focus on what makes this property special.`;

const AMENITIES_PROMPT = `You are analyzing property photos for a rental listing platform. Based on what you can see in the photos, suggest which amenities are present.

Return a JSON object with these boolean/numeric fields ONLY for what you can clearly identify:
{ "pool": true/false, "fenced_yard": true/false, "furnished": true/false, "pets_allowed": null, "parking_spaces": number }

Only set fields you can confidently determine from the photos. Set others to null. Do NOT guess about pets — always set pets_allowed to null. Return ONLY the JSON object, no other text.`;

const REFINE_PROMPT = `You are refining a rental listing description. The owner has requested a specific change. Apply the change while maintaining Fair Housing Act compliance. If the requested change would violate Fair Housing rules, ignore the violating part and make the description better in a compliant way. Keep it under 400 characters.`;

// ── Main handler ──────────────────────────────────────────

export async function POST(request) {
  // Auth check
  const { user, error: authError, status } = await getAuthUser(request);
  if (authError) {
    return NextResponse.json({ error: authError }, { status });
  }

  if (!XAI_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { mode, photo_urls, form_context, refine_prompt } = body;

  if (!mode || !['describe', 'suggest_amenities', 'refine'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  // Fair Housing input scan on refine prompts
  if (refine_prompt && containsFairHousingViolation(refine_prompt)) {
    return NextResponse.json(FAIR_HOUSING_ERROR, { status: 422 });
  }

  try {
    // Build context string from form fields
    const ctx = form_context || {};
    const contextParts = [];
    if (ctx.bedrooms_total) contextParts.push(`${ctx.bedrooms_total}-bed`);
    if (ctx.bathrooms_total) contextParts.push(`${ctx.bathrooms_total}-bath`);
    if (ctx.property_sub_type) contextParts.push(ctx.property_sub_type);
    if (ctx.city) contextParts.push(`in ${ctx.city}, FL`);
    if (ctx.living_area) contextParts.push(`${ctx.living_area} sqft`);
    if (ctx.year_built) contextParts.push(`Built ${ctx.year_built}`);
    if (ctx.pool) contextParts.push('Has a pool');
    if (ctx.furnished) contextParts.push('Furnished');
    if (ctx.pets_allowed) contextParts.push('Pet-friendly');
    if (ctx.fenced_yard) contextParts.push('Fenced yard');
    const contextStr = contextParts.join('. ') + '.';

    // Build messages array
    const messages = [];

    // System prompt based on mode
    let systemPrompt;
    if (mode === 'suggest_amenities') {
      systemPrompt = AMENITIES_PROMPT;
    } else if (mode === 'refine') {
      systemPrompt = REFINE_PROMPT;
    } else {
      systemPrompt = DESCRIBE_PROMPT;
    }
    messages.push({ role: 'system', content: systemPrompt });

    // User message — text + optional vision
    const userContent = [];

    // Add photos as vision content if available
    if (photo_urls?.length > 0) {
      const urls = photo_urls.slice(0, 3); // Max 3 photos
      for (const url of urls) {
        userContent.push({
          type: 'image_url',
          image_url: { url },
        });
      }
    }

    // Add text prompt
    if (mode === 'describe') {
      const photoNote = photo_urls?.length > 0
        ? 'Analyze the photos above and combine what you see with the property details below.'
        : '';
      userContent.push({
        type: 'text',
        text: `${photoNote}\n\nProperty details: ${contextStr}\n\nWrite a compelling rental listing description.`,
      });
    } else if (mode === 'suggest_amenities') {
      userContent.push({
        type: 'text',
        text: `Analyze these property photos and identify visible amenities. Property type: ${ctx.property_sub_type || 'unknown'}, Location: ${ctx.city || 'Florida'}.`,
      });
    } else if (mode === 'refine') {
      userContent.push({
        type: 'text',
        text: `Current description: "${form_context?.current_description || ''}"\n\nOwner's request: "${refine_prompt}"\n\nProperty details: ${contextStr}\n\nRefine the description according to the request.`,
      });
    }

    messages.push({ role: 'user', content: userContent });

    // Call Grok
    const grokRes = await fetch(`${XAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!grokRes.ok) {
      // If vision not supported, fall back to text-only
      if (grokRes.status === 400 && photo_urls?.length > 0) {
        // Retry without images
        const textOnlyMessages = [
          messages[0],
          { role: 'user', content: userContent.filter(c => c.type === 'text').map(c => c.text).join('\n') },
        ];
        const retryRes = await fetch(`${XAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${XAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: XAI_MODEL,
            messages: textOnlyMessages,
            max_tokens: 500,
            temperature: 0.7,
          }),
        });
        if (!retryRes.ok) {
          const errBody = await retryRes.text();
          console.error('[ai-describe] Grok retry failed:', errBody);
          return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
        }
        const retryData = await retryRes.json();
        const retryText = retryData.choices?.[0]?.message?.content?.trim();
        if (!retryText) {
          return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
        }
        // Output scan
        if (containsFairHousingViolation(retryText)) {
          return NextResponse.json({
            description: 'Beautiful rental property with great features and amenities. Contact us for a showing!',
            fallback: true,
          });
        }
        return NextResponse.json({ description: retryText, vision: false });
      }

      const errBody = await grokRes.text();
      console.error('[ai-describe] Grok error:', errBody);
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
    }

    const grokData = await grokRes.json();
    const responseText = grokData.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    // ── Output Fair Housing scan ──
    if (mode !== 'suggest_amenities' && containsFairHousingViolation(responseText)) {
      // Return safe fallback instead of violating content
      return NextResponse.json({
        description: 'Beautiful rental property with great features and amenities. Contact us for a showing!',
        fallback: true,
      });
    }

    // ── Parse response by mode ──
    if (mode === 'suggest_amenities') {
      try {
        // Extract JSON from response (may be wrapped in markdown code block)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const amenities = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ amenities });
        }
      } catch {}
      return NextResponse.json({ error: 'Could not parse amenity suggestions' }, { status: 502 });
    }

    // describe or refine mode
    return NextResponse.json({
      description: responseText.slice(0, 500),
      vision: !!(photo_urls?.length > 0),
    });

  } catch (err) {
    console.error('[ai-describe] Error:', err.message);
    return NextResponse.json({ error: 'AI service error' }, { status: 500 });
  }
}
