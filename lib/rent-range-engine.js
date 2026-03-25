/**
 * Rent-Range Analysis Engine
 *
 * Standalone scoring and synthesis engine for rental comp analysis.
 * No dependency on PadMagnet app code — uses only rr_rental_comps table.
 */

// ============================================================
// DEFAULT SCORING WEIGHTS — document these on the UI
// ============================================================
export const DEFAULT_COMP_WEIGHTS = {
  propertySubType: 25,    // Same property sub-type (SFR, Condo, etc.)
  bedBathMatch: 20,       // Exact bed/bath match
  sqftSimilarity: 15,     // Living area within 10%
  distance: 15,           // Distance from subject (<1mi = full points)
  priceTier: 10,          // Similar price range / assessed value
  communityMatch: 8,      // Same subdivision/gated/HOA match
  freshness: 7,           // Data freshness (<30 days = full points)
};

export const DEFAULT_DATA_MULTIPLIERS = {
  actualLeased: 1.5,      // Closed with ClosePrice — strongest evidence
  activeAsking: 1.0,      // Currently listed asking rent
  expiredAsking: 0.7,     // Was listed, expired without leasing
  webPortal: 0.5,         // Zillow/Realtor.com listing
  marketReport: 0.3,      // Median from market report
};

export const DEFAULT_SOURCE_WEIGHTS = {
  mlsWeight: 70,
  webWeight: 30,
};

// ============================================================
// COMP SCORING
// ============================================================

/**
 * Calculate similarity score (0-100) between subject property and a comp.
 */
export function scoreComp(subject, comp, weights = DEFAULT_COMP_WEIGHTS) {
  let score = 0;

  // 1. Property sub-type match (25 pts)
  // Mismatched types get a PENALTY — not just zero points
  if (subject.propertySubType && comp.property_sub_type) {
    const subjectType = normalizeSubType(subject.propertySubType);
    const compType = normalizeSubType(comp.property_sub_type);
    if (subjectType === compType) {
      score += weights.propertySubType;
    } else if (isRelatedType(subjectType, compType)) {
      score += weights.propertySubType * 0.4;
    } else {
      // Different property type — apply penalty to discourage mixing
      score -= 15;
    }
  }

  // 2. Bed/bath match (20 pts)
  if (subject.beds != null && comp.bedrooms != null) {
    const bedDiff = Math.abs(subject.beds - comp.bedrooms);
    if (bedDiff === 0) score += weights.bedBathMatch;
    else if (bedDiff === 1) score += weights.bedBathMatch * 0.5;
  }
  if (subject.baths != null && comp.bathrooms != null) {
    const bathDiff = Math.abs(subject.baths - comp.bathrooms);
    if (bathDiff === 0) score += weights.bedBathMatch * 0.3; // bonus
  }

  // 3. Sqft similarity (15 pts)
  if (subject.sqft && comp.living_area) {
    const ratio = Math.min(subject.sqft, comp.living_area) / Math.max(subject.sqft, comp.living_area);
    if (ratio >= 0.9) score += weights.sqftSimilarity;
    else if (ratio >= 0.8) score += weights.sqftSimilarity * 0.7;
    else if (ratio >= 0.7) score += weights.sqftSimilarity * 0.4;
  }

  // 4. Distance (15 pts) — requires lat/lng
  if (subject.lat && subject.lng && comp.latitude && comp.longitude) {
    const dist = haversineDistance(subject.lat, subject.lng, comp.latitude, comp.longitude);
    if (dist <= 0.5) score += weights.distance;
    else if (dist <= 1) score += weights.distance * 0.8;
    else if (dist <= 3) score += weights.distance * 0.5;
    else if (dist <= 5) score += weights.distance * 0.3;
    else if (dist <= 10) score += weights.distance * 0.1;
  }

  // 5. Price tier match (10 pts) — if both have list prices
  if (subject.estimatedValue && comp.list_price) {
    const ratio = Math.min(subject.estimatedValue, comp.list_price) / Math.max(subject.estimatedValue, comp.list_price);
    if (ratio >= 0.8) score += weights.priceTier;
    else if (ratio >= 0.6) score += weights.priceTier * 0.5;
  }

  // 6. Community match (8 pts)
  if (subject.subdivision && comp.subdivision_name) {
    if (subject.subdivision.toLowerCase() === comp.subdivision_name.toLowerCase()) {
      score += weights.communityMatch;
    }
  }
  if (subject.gated && comp.community_features) {
    const gated = Array.isArray(comp.community_features)
      ? comp.community_features.some(f => /gated/i.test(f))
      : false;
    if (gated) score += weights.communityMatch * 0.5;
  }
  if (subject.hoa && comp.association_yn) {
    score += weights.communityMatch * 0.3;
  }

  // 7. Freshness (7 pts)
  const compDate = comp.close_date || comp.on_market_date || comp.synced_at;
  if (compDate) {
    const daysOld = (Date.now() - new Date(compDate).getTime()) / 86400000;
    if (daysOld <= 14) score += weights.freshness;
    else if (daysOld <= 30) score += weights.freshness * 0.8;
    else if (daysOld <= 60) score += weights.freshness * 0.5;
    else if (daysOld <= 120) score += weights.freshness * 0.3;
  }

  return Math.round(Math.max(Math.min(score, 100), 0));
}

/**
 * Compute distance in miles between subject and comp. Returns null if coords missing.
 */
export function computeDistance(subject, comp) {
  if (!subject.lat || !subject.lng || !comp.latitude || !comp.longitude) return null;
  return Math.round(haversineDistance(subject.lat, subject.lng, comp.latitude, comp.longitude) * 10) / 10;
}

/**
 * Get the data type multiplier for a comp.
 */
export function getDataMultiplier(comp, multipliers = DEFAULT_DATA_MULTIPLIERS) {
  if (comp._source === 'web_report') return multipliers.marketReport;
  if (comp._source === 'web') return multipliers.webPortal;
  // MLS comp
  if (comp.standard_status === 'Closed' && comp.close_price) return multipliers.actualLeased;
  if (comp.standard_status === 'Active') return multipliers.activeAsking;
  return multipliers.expiredAsking;
}

/**
 * Get the effective rent for a comp (close price preferred over list price).
 */
export function getCompRent(comp) {
  if (comp.close_price && comp.close_price > 0) return comp.close_price;
  if (comp.list_price && comp.list_price > 0) return comp.list_price;
  if (comp.rent) return comp.rent; // web comps
  return null;
}

// ============================================================
// RENT RANGE SYNTHESIS
// ============================================================

/**
 * Calculate rent range from scored comps.
 *
 * @param {Array} mlsComps - scored MLS comps
 * @param {Array} webComps - scored web comps
 * @param {Object} sourceWeights - { mlsWeight: 70, webWeight: 30 }
 * @param {Object} trendData - { direction: 'rising'|'stable'|'declining', magnitude: 0-10 }
 * @returns {{ low, target, high, confidence, trend, methodology }}
 */
export function calculateRentRange(mlsComps, webComps, sourceWeights = DEFAULT_SOURCE_WEIGHTS, trendData = {}) {
  const mlsW = sourceWeights.mlsWeight / 100;
  const webW = sourceWeights.webWeight / 100;

  // Build weighted rent values
  const weightedRents = [];

  for (const comp of mlsComps) {
    const rent = getCompRent(comp);
    if (!rent) continue;
    const similarity = comp._score || 50;
    const dataMultiplier = getDataMultiplier(comp);
    const weight = similarity * dataMultiplier * mlsW;
    weightedRents.push({ rent, weight, source: 'mls' });
  }

  for (const comp of webComps) {
    const rent = getCompRent(comp);
    if (!rent) continue;
    const similarity = comp._score || 30;
    const dataMultiplier = getDataMultiplier(comp);
    const weight = similarity * dataMultiplier * webW;
    weightedRents.push({ rent, weight, source: 'web' });
  }

  if (weightedRents.length === 0) {
    return { low: 0, target: 0, high: 0, confidence: 0, trend: 'unknown' };
  }

  // Sort by rent
  weightedRents.sort((a, b) => a.rent - b.rent);

  // Weighted percentiles
  const totalWeight = weightedRents.reduce((sum, r) => sum + r.weight, 0);
  let cumWeight = 0;
  let p25 = weightedRents[0].rent;
  let p50 = weightedRents[0].rent;
  let p75 = weightedRents[0].rent;

  for (const r of weightedRents) {
    cumWeight += r.weight;
    const pct = cumWeight / totalWeight;
    if (pct >= 0.25 && p25 === weightedRents[0].rent) p25 = r.rent;
    if (pct >= 0.50 && p50 === weightedRents[0].rent) p50 = r.rent;
    if (pct >= 0.75 && p75 === weightedRents[0].rent) p75 = r.rent;
  }

  // Trend adjustment
  let trendAdjustment = 0;
  const trend = trendData.direction || 'stable';
  const magnitude = trendData.magnitude || 0;
  if (trend === 'rising') trendAdjustment = 0.02 + (magnitude * 0.003);
  else if (trend === 'declining') trendAdjustment = -(0.02 + (magnitude * 0.003));

  const low = Math.round(p25 * (1 + trendAdjustment));
  const target = Math.round(p50 * (1 + trendAdjustment));
  const high = Math.round(p75 * (1 + trendAdjustment));

  // Confidence score
  const confidence = calculateConfidence(mlsComps, webComps, weightedRents);

  return {
    low,
    target,
    high,
    confidence,
    trend,
    trendAdjustmentPct: Math.round(trendAdjustment * 1000) / 10,
    compCount: { mls: mlsComps.filter(c => getCompRent(c)).length, web: webComps.filter(c => getCompRent(c)).length },
  };
}

function calculateConfidence(mlsComps, webComps, weightedRents) {
  let score = 0;

  // Comp count (0-30 pts)
  const totalComps = mlsComps.length + webComps.length;
  if (totalComps >= 6) score += 30;
  else if (totalComps >= 4) score += 22;
  else if (totalComps >= 3) score += 15;
  else if (totalComps >= 1) score += 8;

  // Has actual leased data (0-25 pts)
  const leasedComps = mlsComps.filter(c => c.standard_status === 'Closed' && c.close_price);
  if (leasedComps.length >= 3) score += 25;
  else if (leasedComps.length >= 2) score += 18;
  else if (leasedComps.length >= 1) score += 10;

  // Data freshness (0-20 pts)
  const freshComps = mlsComps.filter(c => {
    const date = c.close_date || c.synced_at;
    return date && (Date.now() - new Date(date).getTime()) < 30 * 86400000;
  });
  score += Math.min(20, freshComps.length * 5);

  // Source diversity (0-15 pts)
  const hasMls = mlsComps.length > 0;
  const hasWeb = webComps.length > 0;
  if (hasMls && hasWeb) score += 15;
  else if (hasMls) score += 10;
  else if (hasWeb) score += 5;

  // Agreement between sources (0-10 pts)
  if (weightedRents.length >= 3) {
    const rents = weightedRents.map(r => r.rent);
    const mean = rents.reduce((s, r) => s + r, 0) / rents.length;
    const cv = Math.sqrt(rents.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / rents.length) / mean;
    if (cv < 0.1) score += 10;      // very tight agreement
    else if (cv < 0.2) score += 7;
    else if (cv < 0.3) score += 4;
  }

  return Math.min(100, score);
}

// ============================================================
// HELPERS
// ============================================================

function normalizeSubType(type) {
  if (!type) return '';
  const t = type.toLowerCase().replace(/[^a-z]/g, '');
  if (t.includes('singlefamily') || t === 'sfr') return 'sfr';
  if (t.includes('condo')) return 'condo';
  if (t.includes('townhouse') || t.includes('townhome')) return 'townhouse';
  if (t.includes('duplex')) return 'duplex';
  if (t.includes('triplex')) return 'triplex';
  if (t.includes('quadruplex') || t.includes('quadplex')) return 'quadplex';
  if (t.includes('apartment') || t.includes('coop') || t.includes('cooperative')) return 'condo';
  return t;
}

function isRelatedType(a, b) {
  // Multi-family types are related to each other
  const multiFamily = ['duplex', 'triplex', 'quadplex'];
  if (multiFamily.includes(a) && multiFamily.includes(b)) return true;
  // Condo and townhouse are somewhat related
  if (['condo', 'townhouse'].includes(a) && ['condo', 'townhouse'].includes(b)) return true;
  return false;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
