/**
 * Rent-Range Analysis Engine v2 — Appraiser-Grade Algorithm
 *
 * Market Comparison Approach (MCA) for 1-4 unit residential rentals.
 * Modeled after Fannie Mae Form 1007 / HUD 92273 methodology.
 *
 * Standalone — no PadMagnet app dependencies.
 */

// ============================================================
// CONFIGURATION — All defaults documented for transparency
// ============================================================

/**
 * Similarity scoring weights (sum to 1.0)
 * Based on appraiser-calibrated importance for FL rental market
 */
export const DEFAULT_SIMILARITY_WEIGHTS = {
  propertySubType: 0.20,  // Same type is critical for comp validity
  sqftSimilarity: 0.20,   // Size drives rent more than any single feature
  bedBathMatch: 0.15,     // Room count is primary search criterion for renters
  distance: 0.15,         // Hyperlocal market conditions vary block by block
  priceTier: 0.10,        // $/sqft alignment validates comp is in same tier
  communityMatch: 0.10,   // Subdivision/amenity match
  freshness: 0.10,        // Recent data > stale data
};

/**
 * Data quality multipliers — how much to trust each data type
 * Appraiser standard: verified transaction > asking > self-reported
 */
export const DEFAULT_DATA_MULTIPLIERS = {
  actualLeased: 1.00,     // Verified closed lease — highest reliability
  activeAsking: 0.85,     // Strong but unverified (may negotiate down)
  expiredAsking: 0.70,    // Market-tested but failed to lease at this price
  webPortal: 0.75,        // Good but self-reported (Zillow, Realtor.com)
  marketReport: 0.60,     // Broad median — least property-specific
};

/**
 * Feature adjustment amounts (South Florida 1-4 unit market)
 * Applied dollar-for-dollar to normalize comps to subject features.
 * Calibrated from FL rental market data. Positive = premium.
 */
export const DEFAULT_FEATURE_ADJUSTMENTS = {
  extraBedroom: 300,      // Per bedroom difference ($250-$400 FL avg)
  extraBathroom: 200,     // Per bathroom difference ($150-$250)
  pool: 200,              // Pool premium ($150-$300)
  waterfront: 600,        // Waterfront premium ($400-$800, huge in FL)
  yearBuiltPer10yr: 0.08, // 8% per 10 years newer (applied as % of rent)
  furnished: 150,         // Furnished premium ($100-$200)
  petsAllowed: 75,        // Pet-friendly premium ($50-$100)
  parkingPerSpace: 50,    // Per additional parking space
  gatedCommunity: 100,    // Gated/amenity community premium ($75-$150)
};

export const DEFAULT_SOURCE_WEIGHTS = {
  mlsWeight: 70,
  webWeight: 30,
};

// Minimum weight to include a comp (below this = too dissimilar)
export const MIN_COMP_WEIGHT = 0.15;

// ============================================================
// SIMILARITY SCORING (0.0 – 1.0)
// ============================================================

/**
 * Calculate similarity score between subject and comp.
 * Returns 0.0 to 1.0 (continuous, not integer).
 */
export function scoreComp(subject, comp, weights = DEFAULT_SIMILARITY_WEIGHTS) {
  let score = 0;

  // 1. Property sub-type (20%)
  if (subject.propertySubType && comp.property_sub_type) {
    const subjectType = normalizeSubType(subject.propertySubType);
    const compType = normalizeSubType(comp.property_sub_type);
    if (subjectType === compType) {
      score += weights.propertySubType * 1.0;
    } else if (isCompatibleType(subjectType, compType)) {
      score += weights.propertySubType * 0.75;
    } else {
      score += weights.propertySubType * 0.4;
    }
  }

  // 2. Sqft similarity (20%) — continuous decay, not step bands
  if (subject.sqft && comp.living_area && comp.living_area > 0) {
    const pctDiff = Math.abs(subject.sqft - comp.living_area) / Math.max(subject.sqft, comp.living_area);
    const sqftScore = Math.max(0, 1 - (pctDiff / 0.30)); // decays to 0 at 30% difference
    score += weights.sqftSimilarity * sqftScore;
  }

  // 3. Bed/bath match (15%)
  if (subject.beds != null && comp.bedrooms != null) {
    const totalSubject = (subject.beds || 0) + (subject.baths || 0);
    const totalComp = (comp.bedrooms || 0) + (Number(comp.bathrooms) || 0);
    const roomDiff = Math.abs(totalSubject - totalComp);
    if (roomDiff === 0) score += weights.bedBathMatch * 1.0;
    else if (roomDiff <= 1) score += weights.bedBathMatch * 0.85;
    else if (roomDiff <= 2) score += weights.bedBathMatch * 0.6;
    else score += weights.bedBathMatch * 0.3;
  }

  // 4. Distance (15%) — linear decay to 0 at max radius
  if (subject.lat && subject.lng && comp.latitude && comp.longitude) {
    const dist = haversineDistance(subject.lat, subject.lng, comp.latitude, comp.longitude);
    const maxRadius = 2.0; // 2 miles for suburban FL
    const distScore = Math.max(0, 1 - (dist / maxRadius));
    score += weights.distance * distScore;
  }

  // 5. Price tier (10%) — $/sqft of comp vs local market
  if (subject.sqft && comp.living_area && comp.living_area > 0) {
    const compRent = getCompRent(comp);
    if (compRent && subject.estimatedRentPerSqft) {
      const compRentPerSqft = compRent / comp.living_area;
      const ratio = Math.min(compRentPerSqft, subject.estimatedRentPerSqft) /
                    Math.max(compRentPerSqft, subject.estimatedRentPerSqft);
      if (ratio >= 0.80) score += weights.priceTier * 1.0;
      else score += weights.priceTier * ratio;
    }
  }

  // 6. Community match (10%)
  if (subject.subdivision && comp.subdivision_name) {
    if (subject.subdivision.toLowerCase() === comp.subdivision_name.toLowerCase()) {
      score += weights.communityMatch * 1.0;
    } else if (subject.zip && comp.postal_code && subject.zip === comp.postal_code) {
      score += weights.communityMatch * 0.7;
    } else {
      score += weights.communityMatch * 0.4;
    }
  } else if (subject.zip && comp.postal_code && subject.zip === comp.postal_code) {
    score += weights.communityMatch * 0.7;
  } else {
    score += weights.communityMatch * 0.4;
  }

  // 7. Freshness (10%)
  const compDate = comp.close_date || comp.on_market_date || comp.synced_at;
  if (compDate) {
    const daysOld = (Date.now() - new Date(compDate).getTime()) / 86400000;
    if (daysOld <= 30) score += weights.freshness * 1.0;
    else if (daysOld <= 90) score += weights.freshness * 0.85;
    else if (daysOld <= 180) score += weights.freshness * 0.6;
    else if (daysOld <= 365) score += weights.freshness * 0.4;
  }

  return Math.round(score * 1000) / 1000; // 3 decimal places
}

// ============================================================
// FEATURE ADJUSTMENTS (Appraiser Grid)
// ============================================================

/**
 * Calculate dollar adjustments to normalize a comp's rent to the subject's features.
 * Returns { adjustedRent, adjustments[] } where each adjustment has { feature, amount, reason }.
 *
 * Convention: positive adjustment means comp rent should be HIGHER to match subject.
 * (Subject has feature comp lacks → comp's adjusted rent goes UP)
 */
export function applyFeatureAdjustments(subject, comp, featureAdj = DEFAULT_FEATURE_ADJUSTMENTS) {
  const rawRent = getCompRent(comp);
  if (!rawRent) return { adjustedRent: 0, adjustments: [] };

  const adjustments = [];
  let totalAdj = 0;

  // 1. Sqft adjustment (primary) — $/sqft normalization
  if (subject.sqft && comp.living_area && comp.living_area > 0) {
    const rentPerSqft = rawRent / comp.living_area;
    const sqftAdjusted = rentPerSqft * subject.sqft;
    const sqftDelta = Math.round(sqftAdjusted - rawRent);
    if (sqftDelta !== 0) {
      adjustments.push({
        feature: 'Sqft',
        amount: sqftDelta,
        reason: `${Number(comp.living_area).toLocaleString()}sf → ${Number(subject.sqft).toLocaleString()}sf @ $${rentPerSqft.toFixed(2)}/sf`,
      });
      totalAdj += sqftDelta;
    }
  }

  // 2. Bedroom adjustment
  if (subject.beds != null && comp.bedrooms != null) {
    const bedDiff = subject.beds - comp.bedrooms; // positive = subject has more
    if (bedDiff !== 0) {
      const adj = bedDiff * featureAdj.extraBedroom;
      adjustments.push({
        feature: 'Bedrooms',
        amount: adj,
        reason: `${comp.bedrooms}bd → ${subject.beds}bd (${bedDiff > 0 ? '+' : ''}${bedDiff} @ $${featureAdj.extraBedroom})`,
      });
      totalAdj += adj;
    }
  }

  // 3. Bathroom adjustment
  if (subject.baths != null && comp.bathrooms != null) {
    const bathDiff = subject.baths - Number(comp.bathrooms);
    if (Math.abs(bathDiff) >= 0.5) {
      const adj = Math.round(bathDiff * featureAdj.extraBathroom);
      adjustments.push({
        feature: 'Bathrooms',
        amount: adj,
        reason: `${comp.bathrooms}ba → ${subject.baths}ba (${bathDiff > 0 ? '+' : ''}${bathDiff} @ $${featureAdj.extraBathroom})`,
      });
      totalAdj += adj;
    }
  }

  // 4. Pool adjustment
  const subjectPool = subject.pool === true;
  const compPool = comp.pool === true;
  if (subjectPool !== compPool) {
    const adj = subjectPool ? featureAdj.pool : -featureAdj.pool;
    adjustments.push({
      feature: 'Pool',
      amount: adj,
      reason: `Subject ${subjectPool ? 'has' : 'no'} pool, comp ${compPool ? 'has' : 'no'} pool`,
    });
    totalAdj += adj;
  }

  // 5. Waterfront adjustment
  const subjectWF = subject.waterfront === true;
  const compWF = comp.waterfront === true;
  if (subjectWF !== compWF) {
    const adj = subjectWF ? featureAdj.waterfront : -featureAdj.waterfront;
    adjustments.push({
      feature: 'Waterfront',
      amount: adj,
      reason: `Subject ${subjectWF ? 'is' : 'not'} waterfront, comp ${compWF ? 'is' : 'not'} waterfront`,
    });
    totalAdj += adj;
  }

  // 6. Year built adjustment (% of rent per decade)
  if (subject.yearBuilt && comp.year_built) {
    const yearDiff = subject.yearBuilt - comp.year_built; // positive = subject newer
    if (Math.abs(yearDiff) >= 5) {
      const decades = yearDiff / 10;
      const adj = Math.round(rawRent * featureAdj.yearBuiltPer10yr * decades);
      adjustments.push({
        feature: 'Year Built',
        amount: adj,
        reason: `Built ${comp.year_built} → ${subject.yearBuilt} (${Math.abs(yearDiff)}yr, ${decades > 0 ? '+' : ''}${(decades * featureAdj.yearBuiltPer10yr * 100).toFixed(0)}%)`,
      });
      totalAdj += adj;
    }
  }

  // 7. Furnished adjustment
  const subjectFurn = subject.furnished === true;
  const compFurn = comp.furnished === true;
  if (subjectFurn !== compFurn) {
    const adj = subjectFurn ? featureAdj.furnished : -featureAdj.furnished;
    adjustments.push({
      feature: 'Furnished',
      amount: adj,
      reason: `Subject ${subjectFurn ? 'furnished' : 'unfurnished'}, comp ${compFurn ? 'furnished' : 'unfurnished'}`,
    });
    totalAdj += adj;
  }

  // 8. Pets adjustment
  const subjectPets = subject.petsAllowed === true;
  const compPets = comp.pets_allowed === true;
  if (subjectPets !== compPets) {
    const adj = subjectPets ? featureAdj.petsAllowed : -featureAdj.petsAllowed;
    adjustments.push({
      feature: 'Pets',
      amount: adj,
      reason: `Subject ${subjectPets ? 'allows' : 'no'} pets, comp ${compPets ? 'allows' : 'no'} pets`,
    });
    totalAdj += adj;
  }

  // 9. Parking adjustment
  const subjectPark = subject.parkingSpaces || 0;
  const compPark = comp.parking_spaces || 0;
  if (subjectPark !== compPark) {
    const diff = subjectPark - compPark;
    const adj = diff * featureAdj.parkingPerSpace;
    adjustments.push({
      feature: 'Parking',
      amount: adj,
      reason: `${compPark} spaces → ${subjectPark} spaces (${diff > 0 ? '+' : ''}${diff} @ $${featureAdj.parkingPerSpace})`,
    });
    totalAdj += adj;
  }

  // 10. Gated community / HOA amenities
  const subjectGated = subject.gated === true;
  const compGated = comp.association_yn === true || (Array.isArray(comp.community_features) && comp.community_features.some(f => /gated/i.test(f)));
  if (subjectGated !== compGated) {
    const adj = subjectGated ? featureAdj.gatedCommunity : -featureAdj.gatedCommunity;
    adjustments.push({
      feature: 'Gated/HOA',
      amount: adj,
      reason: `Subject ${subjectGated ? 'gated' : 'not gated'}, comp ${compGated ? 'gated' : 'not gated'}`,
    });
    totalAdj += adj;
  }

  return {
    adjustedRent: Math.round(rawRent + totalAdj),
    rawRent,
    totalAdjustment: totalAdj,
    adjustments,
  };
}

// ============================================================
// RENT RANGE SYNTHESIS
// ============================================================

/**
 * Calculate rent range from scored and feature-adjusted comps.
 */
export function calculateRentRange(mlsComps, webComps, sourceWeights = DEFAULT_SOURCE_WEIGHTS, trendData = {}, subject = {}) {
  const mlsW = sourceWeights.mlsWeight / 100;
  const webW = sourceWeights.webWeight / 100;

  const weightedRents = [];

  for (const comp of mlsComps) {
    // Use feature-adjusted rent (includes sqft normalization + all feature adjustments)
    const { adjustedRent } = applyFeatureAdjustments(subject, comp);
    if (!adjustedRent || adjustedRent <= 0) continue;

    const similarity = comp._score || 0.5;
    const dataMultiplier = getDataMultiplier(comp);
    const weight = similarity * dataMultiplier * mlsW;

    if (weight < MIN_COMP_WEIGHT) continue; // too dissimilar, skip

    weightedRents.push({ rent: adjustedRent, rawRent: getCompRent(comp), weight, source: 'mls' });
  }

  for (const comp of webComps) {
    const rent = getCompRent(comp);
    if (!rent) continue;
    const similarity = comp._score || 0.3;
    const dataMultiplier = getDataMultiplier(comp);
    const weight = similarity * dataMultiplier * webW;

    if (weight < MIN_COMP_WEIGHT) continue;

    weightedRents.push({ rent, rawRent: rent, weight, source: 'web' });
  }

  if (weightedRents.length === 0) {
    return { low: 0, target: 0, high: 0, confidence: 0, trend: 'unknown', compCount: { mls: 0, web: 0 } };
  }

  // Sort by adjusted rent
  weightedRents.sort((a, b) => a.rent - b.rent);

  // Weighted percentiles
  const totalWeight = weightedRents.reduce((sum, r) => sum + r.weight, 0);
  let cumWeight = 0;
  let p25 = weightedRents[0].rent;
  let p50 = weightedRents[0].rent;
  let p75 = weightedRents[0].rent;

  for (const r of weightedRents) {
    const prevPct = cumWeight / totalWeight;
    cumWeight += r.weight;
    const pct = cumWeight / totalWeight;
    if (prevPct < 0.25 && pct >= 0.25) p25 = r.rent;
    if (prevPct < 0.50 && pct >= 0.50) p50 = r.rent;
    if (prevPct < 0.75 && pct >= 0.75) p75 = r.rent;
  }

  // Trend adjustment
  let trendAdjustment = 0;
  const trend = trendData.direction || 'stable';
  const magnitude = trendData.magnitude || 0;
  if (trend === 'rising') trendAdjustment = 0.02 + Math.min(magnitude, 10) * 0.003;
  else if (trend === 'declining') trendAdjustment = -(0.02 + Math.min(magnitude, 10) * 0.003);

  // High vacancy widens range on low side
  const vacancy = trendData.vacancy || 0;
  let vacancyAdj = 0;
  if (vacancy > 8) vacancyAdj = -0.05; // soft market, widen low

  const low = Math.round(p25 * (1 + trendAdjustment + vacancyAdj));
  const target = Math.round(p50 * (1 + trendAdjustment));
  const high = Math.round(p75 * (1 + trendAdjustment));

  const confidence = calculateConfidence(mlsComps, webComps, weightedRents);

  return {
    low, target, high,
    confidence,
    trend,
    trendAdjustmentPct: Math.round(trendAdjustment * 1000) / 10,
    compCount: {
      mls: weightedRents.filter(r => r.source === 'mls').length,
      web: weightedRents.filter(r => r.source === 'web').length,
      total: weightedRents.length,
      dropped: (mlsComps.length + webComps.length) - weightedRents.length,
    },
  };
}

function calculateConfidence(mlsComps, webComps, weightedRents) {
  let score = 0;

  // Comp count (0-30)
  const total = weightedRents.length;
  if (total >= 8) score += 30;
  else if (total >= 5) score += 22;
  else if (total >= 3) score += 15;
  else if (total >= 1) score += 8;

  // Verified leases (0-25)
  const leased = mlsComps.filter(c => c.standard_status === 'Closed' && c.close_price).length;
  if (leased >= 3) score += 25;
  else if (leased >= 2) score += 18;
  else if (leased >= 1) score += 10;

  // Freshness (0-20)
  const fresh = mlsComps.filter(c => {
    const date = c.close_date || c.synced_at;
    return date && (Date.now() - new Date(date).getTime()) < 90 * 86400000;
  }).length;
  score += Math.min(20, fresh * 4);

  // Source diversity (0-15)
  const hasMls = weightedRents.some(r => r.source === 'mls');
  const hasWeb = weightedRents.some(r => r.source === 'web');
  if (hasMls && hasWeb) score += 15;
  else if (hasMls) score += 10;
  else score += 5;

  // Agreement / low variance (0-10)
  if (weightedRents.length >= 3) {
    const rents = weightedRents.map(r => r.rent);
    const mean = rents.reduce((s, r) => s + r, 0) / rents.length;
    const cv = Math.sqrt(rents.reduce((s, r) => s + (r - mean) ** 2, 0) / rents.length) / mean;
    if (cv < 0.10) score += 10;
    else if (cv < 0.15) score += 7;
    else if (cv < 0.25) score += 4;
  }

  // Low comp count flag
  if (total < 5) score = Math.min(score, 60); // cap at 60 if <5 comps

  return Math.min(100, score);
}

// ============================================================
// UTILITY EXPORTS
// ============================================================

export function getCompRent(comp) {
  if (comp.close_price && comp.close_price > 0) return Number(comp.close_price);
  if (comp.list_price && comp.list_price > 0) return Number(comp.list_price);
  if (comp.rent) return Number(comp.rent);
  return null;
}

export function getDataMultiplier(comp, multipliers = DEFAULT_DATA_MULTIPLIERS) {
  if (comp._source === 'web_report') return multipliers.marketReport;
  if (comp._source === 'web') return multipliers.webPortal;
  if (comp.standard_status === 'Closed' && comp.close_price) return multipliers.actualLeased;
  if (comp.standard_status === 'Active') return multipliers.activeAsking;
  return multipliers.expiredAsking;
}

export function computeRentPerSqft(comp) {
  const rent = getCompRent(comp);
  const sqft = Number(comp.living_area) || Number(comp.sqft) || 0;
  if (!rent || sqft <= 0) return null;
  return Math.round((rent / sqft) * 100) / 100;
}

export function computeDistance(subject, comp) {
  if (!subject.lat || !subject.lng || !comp.latitude || !comp.longitude) return null;
  return Math.round(haversineDistance(subject.lat, subject.lng, comp.latitude, comp.longitude) * 10) / 10;
}

// ============================================================
// HELPERS
// ============================================================

function normalizeSubType(type) {
  if (!type) return '';
  const t = type.toLowerCase().replace(/[^a-z]/g, '');
  if (t.includes('singlefamily') || t === 'sfr') return 'sfr';
  if (t.includes('condo') || t.includes('cooperative')) return 'condo';
  if (t.includes('townhouse') || t.includes('townhome')) return 'townhouse';
  if (t.includes('villa')) return 'villa';
  if (t.includes('duplex')) return 'duplex';
  if (t.includes('triplex')) return 'triplex';
  if (t.includes('quadruplex') || t.includes('quadplex')) return 'quadplex';
  if (t.includes('apartment') || t.includes('multifamily')) return 'multifamily';
  return t;
}

function isCompatibleType(a, b) {
  const groups = [
    ['duplex', 'triplex', 'quadplex', 'multifamily'],
    ['condo', 'townhouse', 'villa'],
    ['sfr'],
  ];
  for (const group of groups) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  // Cross-group compatibility at reduced level (SFR↔townhouse)
  if (['sfr', 'townhouse'].includes(a) && ['sfr', 'townhouse'].includes(b)) return true;
  return false;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
