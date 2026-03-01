/**
 * PadScore™ — Server-side deterministic preference-matching engine
 * Rule-based weighted scoring (NOT AI/ML — per MLS agreement compliance)
 *
 * Inputs: tenant preferences + listing attributes
 * Output: 0-100 score + factor breakdown
 */

const WEIGHTS = {
  budget_over: 35,
  property_type: 25,
  beds_short: 18,
  baths_short: 12,
  location_inside_radius: 14,
  location_outside_radius: 40,
  pets_not_allowed: 50,       // dealbreaker
  pets_unknown: 10,
  fenced_yard_bonus: 8,
  fenced_yard_missing: 12,
  hoa_mismatch: 8,
  furnished_mismatch: 6,
  lease_too_short: 35,
  stale_listing_major: 5,
  stale_listing_minor: 2,
};

const MAX_PENALTY = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);

/**
 * Haversine distance between two lat/lng points in miles.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate PadScore for a listing given tenant preferences.
 * @param {Object} prefs - tenant_preferences row
 * @param {Object} listing - listings row
 * @returns {{ score: number, factors: Array, explanation: string }}
 */
export function calculatePadScore(prefs, listing) {
  if (!prefs) return { score: 50, factors: [], explanation: 'Set your preferences for personalized scores.' };

  const factors = [];
  let totalPenalty = 0;
  let totalBonus = 0;

  // Budget: penalty if listing price exceeds budget_max
  if (prefs.budget_max && listing.list_price > prefs.budget_max) {
    const overBy = listing.list_price - prefs.budget_max;
    const severity = Math.min(overBy / prefs.budget_max, 1);
    const penalty = WEIGHTS.budget_over * severity;
    totalPenalty += penalty;
    factors.push({ key: 'budget_over', label: 'Over Budget', impact: -penalty, match: false });
  } else if (prefs.budget_max) {
    factors.push({ key: 'budget_over', label: 'Within Budget', impact: 0, match: true });
  }

  // Property type
  if (prefs.property_types?.length > 0 && listing.property_sub_type) {
    if (!prefs.property_types.includes(listing.property_sub_type)) {
      totalPenalty += WEIGHTS.property_type;
      factors.push({ key: 'property_type', label: 'Wrong Type', impact: -WEIGHTS.property_type, match: false });
    } else {
      factors.push({ key: 'property_type', label: 'Right Type', impact: 0, match: true });
    }
  }

  // Bedrooms
  if (prefs.beds_min && listing.bedrooms_total < prefs.beds_min) {
    const shortBy = prefs.beds_min - listing.bedrooms_total;
    const penalty = WEIGHTS.beds_short * Math.min(shortBy / prefs.beds_min, 1);
    totalPenalty += penalty;
    factors.push({ key: 'beds_short', label: 'Too Few Beds', impact: -penalty, match: false });
  } else if (prefs.beds_min) {
    factors.push({ key: 'beds_short', label: 'Enough Beds', impact: 0, match: true });
  }

  // Bathrooms
  if (prefs.baths_min && listing.bathrooms_total < prefs.baths_min) {
    const penalty = WEIGHTS.baths_short;
    totalPenalty += penalty;
    factors.push({ key: 'baths_short', label: 'Too Few Baths', impact: -penalty, match: false });
  } else if (prefs.baths_min) {
    factors.push({ key: 'baths_short', label: 'Enough Baths', impact: 0, match: true });
  }

  // Location distance
  const dist = haversineDistance(prefs.center_lat, prefs.center_lng, listing.latitude, listing.longitude);
  if (dist !== null && prefs.radius_miles) {
    if (dist <= prefs.radius_miles) {
      // Inside radius: gentle falloff
      const falloff = dist / prefs.radius_miles;
      const penalty = WEIGHTS.location_inside_radius * falloff;
      totalPenalty += penalty;
      factors.push({ key: 'location_inside_radius', label: `${dist.toFixed(1)} mi away`, impact: -penalty, match: true });
    } else {
      // Outside radius: sharp cliff
      const overBy = (dist - prefs.radius_miles) / prefs.radius_miles;
      const penalty = WEIGHTS.location_outside_radius * Math.min(overBy, 1);
      totalPenalty += penalty;
      factors.push({ key: 'location_outside_radius', label: `${dist.toFixed(1)} mi (outside radius)`, impact: -penalty, match: false });
    }
  }

  // Pets
  if (prefs.pets_required) {
    if (listing.pets_allowed === false) {
      // Dealbreaker
      totalPenalty += WEIGHTS.pets_not_allowed;
      factors.push({ key: 'pets_not_allowed', label: 'No Pets Allowed', impact: -WEIGHTS.pets_not_allowed, match: false });
    } else if (listing.pets_allowed === null || listing.pets_allowed === undefined) {
      totalPenalty += WEIGHTS.pets_unknown;
      factors.push({ key: 'pets_unknown', label: 'Pet Policy Unknown', impact: -WEIGHTS.pets_unknown, match: false });
    } else {
      factors.push({ key: 'pets_allowed', label: 'Pets Allowed', impact: 0, match: true });
    }

    // Fenced yard
    if (listing.fenced_yard === true) {
      totalBonus += WEIGHTS.fenced_yard_bonus;
      factors.push({ key: 'fenced_yard_bonus', label: 'Fenced Yard', impact: WEIGHTS.fenced_yard_bonus, match: true });
    } else if (prefs.fenced_yard_required && !listing.fenced_yard) {
      totalPenalty += WEIGHTS.fenced_yard_missing;
      factors.push({ key: 'fenced_yard_missing', label: 'No Fenced Yard', impact: -WEIGHTS.fenced_yard_missing, match: false });
    }
  }

  // HOA mismatch
  if (prefs.max_hoa !== null && prefs.max_hoa !== undefined && listing.hoa_fee > prefs.max_hoa) {
    totalPenalty += WEIGHTS.hoa_mismatch;
    factors.push({ key: 'hoa_mismatch', label: 'HOA Too High', impact: -WEIGHTS.hoa_mismatch, match: false });
  }

  // Furnished mismatch
  if (prefs.furnished_preferred !== null && prefs.furnished_preferred !== undefined) {
    if (listing.furnished !== null && listing.furnished !== prefs.furnished_preferred) {
      totalPenalty += WEIGHTS.furnished_mismatch;
      factors.push({ key: 'furnished_mismatch', label: 'Furnished Mismatch', impact: -WEIGHTS.furnished_mismatch, match: false });
    }
  }

  // Stale listing
  if (listing.created_at) {
    const daysOnMarket = Math.floor((Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOnMarket > 60) {
      totalPenalty += WEIGHTS.stale_listing_major;
      factors.push({ key: 'stale_listing_major', label: `${daysOnMarket} days on market`, impact: -WEIGHTS.stale_listing_major, match: false });
    } else if (daysOnMarket > 30) {
      totalPenalty += WEIGHTS.stale_listing_minor;
      factors.push({ key: 'stale_listing_minor', label: `${daysOnMarket} days on market`, impact: -WEIGHTS.stale_listing_minor, match: false });
    }
  }

  // Calculate final score: start at 100, subtract normalized penalty, add bonus
  const normalizedPenalty = (totalPenalty / MAX_PENALTY) * 100;
  const score = Math.max(0, Math.min(100, Math.round(100 - normalizedPenalty + totalBonus)));

  // Generate explanation
  const matched = factors.filter(f => f.match).map(f => f.label.toLowerCase());
  const explanation = matched.length > 0
    ? `Matches your ${matched.slice(0, 3).join(', ')}${matched.length > 3 ? ` and ${matched.length - 3} more` : ''}.`
    : 'Limited match with your preferences.';

  return { score, factors, explanation };
}
