// PadScore™ — Client-side deterministic preference-matching engine
// Mirrors the server-side algorithm in lib/padscore.js exactly
// Rule-based weighted scoring (NOT AI/ML — per MLS agreement compliance)

const WEIGHTS = {
  budget_over: 35,
  property_type: 25,
  beds_short: 18,
  baths_short: 12,
  location_inside_radius: 14,
  location_outside_radius: 40,
  pets_not_allowed: 50,
  pets_unknown: 10,
  fenced_yard_bonus: 8,
  fenced_yard_missing: 12,
  association_mismatch: 50,
  furnished_mismatch: 6,
  lease_too_short: 35,
  stale_listing_major: 5,
  stale_listing_minor: 2,
  no_photos: 35,
};

const MAX_PENALTY = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);

function haversineDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculatePadScore(preferences, listing, zones) {
  if (!preferences) return { score: 50, factors: [], explanation: 'Set your preferences for personalized scores.' };

  const factors = [];
  let totalPenalty = 0;
  let totalBonus = 0;

  // Budget
  if (preferences.budget_max && listing.list_price > preferences.budget_max) {
    const overBy = listing.list_price - preferences.budget_max;
    const severity = Math.min(overBy / preferences.budget_max, 1);
    const penalty = WEIGHTS.budget_over * severity;
    totalPenalty += penalty;
    factors.push({ key: 'budget_over', label: 'Over Budget', impact: -penalty, match: false });
  } else if (preferences.budget_max) {
    factors.push({ key: 'budget_over', label: 'Within Budget', impact: 0, match: true });
  }

  // Property type
  if (preferences.property_types?.length > 0 && listing.property_sub_type) {
    if (!preferences.property_types.includes(listing.property_sub_type)) {
      totalPenalty += WEIGHTS.property_type;
      factors.push({ key: 'property_type', label: 'Wrong Type', impact: -WEIGHTS.property_type, match: false });
    } else {
      factors.push({ key: 'property_type', label: 'Right Type', impact: 0, match: true });
    }
  }

  // Bedrooms
  if (preferences.beds_min && listing.bedrooms_total < preferences.beds_min) {
    const shortBy = preferences.beds_min - listing.bedrooms_total;
    const penalty = WEIGHTS.beds_short * Math.min(shortBy / preferences.beds_min, 1);
    totalPenalty += penalty;
    factors.push({ key: 'beds_short', label: 'Too Few Beds', impact: -penalty, match: false });
  } else if (preferences.beds_min) {
    factors.push({ key: 'beds_short', label: 'Enough Beds', impact: 0, match: true });
  }

  // Bathrooms
  if (preferences.baths_min && listing.bathrooms_total < preferences.baths_min) {
    totalPenalty += WEIGHTS.baths_short;
    factors.push({ key: 'baths_short', label: 'Too Few Baths', impact: -WEIGHTS.baths_short, match: false });
  } else if (preferences.baths_min) {
    factors.push({ key: 'baths_short', label: 'Enough Baths', impact: 0, match: true });
  }

  // Location distance — multi-zone: use best (lowest penalty) match across all zones
  let bestLocPenalty = null;
  let bestLocFactor = null;

  const locSources = [];
  if (zones && zones.length > 0) {
    for (const zone of zones) {
      locSources.push({ lat: zone.center_lat, lng: zone.center_lng, radius: parseFloat(zone.radius_miles), label: zone.label });
    }
  } else if (preferences.center_lat && preferences.center_lng && preferences.radius_miles) {
    locSources.push({ lat: preferences.center_lat, lng: preferences.center_lng, radius: preferences.radius_miles, label: null });
  }

  for (const src of locSources) {
    const dist = haversineDistance(src.lat, src.lng, listing.latitude, listing.longitude);
    if (dist === null) continue;

    let penalty, factor;
    if (dist <= src.radius) {
      const falloff = dist / src.radius;
      penalty = WEIGHTS.location_inside_radius * falloff;
      const label = src.label ? `${dist.toFixed(1)} mi from ${src.label}` : `${dist.toFixed(1)} mi away`;
      factor = { key: 'location', label, impact: -penalty, match: true };
    } else {
      const overBy = (dist - src.radius) / src.radius;
      penalty = WEIGHTS.location_outside_radius * Math.min(overBy, 1);
      const label = src.label ? `${dist.toFixed(1)} mi from ${src.label} (outside)` : `${dist.toFixed(1)} mi (outside radius)`;
      factor = { key: 'location', label, impact: -penalty, match: false };
    }

    if (bestLocPenalty === null || penalty < bestLocPenalty) {
      bestLocPenalty = penalty;
      bestLocFactor = factor;
    }
  }

  if (bestLocFactor) {
    totalPenalty += bestLocPenalty;
    factors.push(bestLocFactor);
  }

  // Pets
  if (preferences.pets_required) {
    if (listing.pets_allowed === false) {
      totalPenalty += WEIGHTS.pets_not_allowed;
      factors.push({ key: 'pets', label: 'No Pets Allowed', impact: -WEIGHTS.pets_not_allowed, match: false });
    } else if (listing.pets_allowed === null || listing.pets_allowed === undefined) {
      totalPenalty += WEIGHTS.pets_unknown;
      factors.push({ key: 'pets', label: 'Pet Policy Unknown', impact: -WEIGHTS.pets_unknown, match: false });
    } else {
      factors.push({ key: 'pets', label: 'Pets Allowed', impact: 0, match: true });
    }

    if (listing.fenced_yard === true) {
      totalBonus += WEIGHTS.fenced_yard_bonus;
      factors.push({ key: 'fenced_yard', label: 'Fenced Yard', impact: WEIGHTS.fenced_yard_bonus, match: true });
    } else if (preferences.fenced_yard_required && !listing.fenced_yard) {
      totalPenalty += WEIGHTS.fenced_yard_missing;
      factors.push({ key: 'fenced_yard', label: 'No Fenced Yard', impact: -WEIGHTS.fenced_yard_missing, match: false });
    }
  }

  // Association mismatch — only penalize if tenant dislikes HOA and property has one
  if (preferences.association_preferred === false && listing.hoa_fee > 0) {
    totalPenalty += WEIGHTS.association_mismatch;
    factors.push({ key: 'association', label: 'Has Association', impact: -WEIGHTS.association_mismatch, match: false });
  } else if (preferences.association_preferred != null) {
    factors.push({ key: 'association', label: 'Association OK', impact: 0, match: true });
  }

  // Furnished
  if (preferences.furnished_preferred != null && listing.furnished != null && listing.furnished !== preferences.furnished_preferred) {
    totalPenalty += WEIGHTS.furnished_mismatch;
    factors.push({ key: 'furnished', label: 'Furnished Mismatch', impact: -WEIGHTS.furnished_mismatch, match: false });
  }

  // Lease term too short
  if (preferences.min_lease_months && listing.lease_term) {
    const months = parseInt(listing.lease_term, 10);
    if (!isNaN(months) && months < preferences.min_lease_months) {
      totalPenalty += WEIGHTS.lease_too_short;
      factors.push({ key: 'lease_too_short', label: 'Lease Too Short', impact: -WEIGHTS.lease_too_short, match: false });
    } else if (!isNaN(months)) {
      factors.push({ key: 'lease_too_short', label: 'Lease Length OK', impact: 0, match: true });
    }
  }

  // Stale listing
  if (listing.created_at) {
    const dom = Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86400000);
    if (dom > 60) {
      totalPenalty += WEIGHTS.stale_listing_major;
      factors.push({ key: 'stale', label: `${dom}d on market`, impact: -WEIGHTS.stale_listing_major, match: false });
    } else if (dom > 30) {
      totalPenalty += WEIGHTS.stale_listing_minor;
      factors.push({ key: 'stale', label: `${dom}d on market`, impact: -WEIGHTS.stale_listing_minor, match: false });
    }
  }

  // No photos — significant presentation penalty
  if (!listing.photos || listing.photos.length === 0) {
    totalPenalty += WEIGHTS.no_photos;
    factors.push({ key: 'no_photos', label: 'No Photos Available', impact: -WEIGHTS.no_photos, match: false });
  }

  const normalizedPenalty = (totalPenalty / MAX_PENALTY) * 100;
  const score = Math.max(0, Math.min(100, Math.round(100 - normalizedPenalty + totalBonus)));

  const matched = factors.filter(f => f.match).map(f => f.label.toLowerCase());
  const explanation = matched.length > 0
    ? `Matches your ${matched.slice(0, 3).join(', ')}${matched.length > 3 ? ` +${matched.length - 3} more` : ''}.`
    : 'Limited match with your preferences.';

  return { score, factors, explanation };
}

export function explainScore(factors) {
  const matched = factors.filter(f => f.match).map(f => f.label);
  if (matched.length === 0) return 'Limited match with your preferences.';
  return `Shown because it matches your ${matched.join(', ')}.`;
}
