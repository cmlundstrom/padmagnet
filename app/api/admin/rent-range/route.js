import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import {
  scoreComp, calculateRentRange, getCompRent, computeDistance, computeRentPerSqft,
  applyFeatureAdjustments,
  DEFAULT_SIMILARITY_WEIGHTS, DEFAULT_DATA_MULTIPLIERS, DEFAULT_SOURCE_WEIGHTS, DEFAULT_FEATURE_ADJUSTMENTS,
} from '../../../../lib/rent-range-engine';
import { runWebSearchPipeline } from '../../../../lib/rent-range-web-search';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// County appraiser links (expandable)
const COUNTY_APPRAISERS = {
  'Martin County': { name: 'Martin County Property Appraiser', url: 'https://www.pamartinfl.gov/app/search/real-property' },
};

// GET — fetch recent reports + available counties
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (reportId) {
      const { data, error } = await supabase
        .from('rent_range_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 404 });
      return NextResponse.json(data);
    }

    // List recent reports
    const { data: reports } = await supabase
      .from('rent_range_reports')
      .select('id, property_address, city, county, rent_range, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    // Comp data stats
    const { data: compStats } = await supabase
      .from('rr_rental_comps')
      .select('county, standard_status');

    const stats = {};
    for (const comp of (compStats || [])) {
      if (!stats[comp.county]) stats[comp.county] = { active: 0, closed: 0 };
      if (comp.standard_status === 'Active') stats[comp.county].active++;
      else if (comp.standard_status === 'Closed') stats[comp.county].closed++;
    }

    return NextResponse.json({
      reports: reports || [],
      compStats: stats,
      countyAppraisers: COUNTY_APPRAISERS,
      defaults: { similarityWeights: DEFAULT_SIMILARITY_WEIGHTS, dataMultipliers: DEFAULT_DATA_MULTIPLIERS, sourceWeights: DEFAULT_SOURCE_WEIGHTS, featureAdjustments: DEFAULT_FEATURE_ADJUSTMENTS },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — generate a new rent-range report
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { property, sourceWeights } = body;

    if (!property?.address || !property?.city || !property?.county) {
      return NextResponse.json({ error: 'address, city, and county are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get requesting user ID
    const { data: { user } } = await supabase.auth.getUser();

    // Create report record (status: generating)
    const { data: report, error: createErr } = await supabase
      .from('rent_range_reports')
      .insert({
        property_address: property.address,
        city: property.city,
        county: property.county,
        state: property.state || 'FL',
        zip: property.zip,
        property_details: {
          beds: property.beds,
          baths: property.baths,
          sqft: property.sqft,
          yearBuilt: property.yearBuilt,
          propertySubType: property.propertySubType,
          hoa: property.hoa,
          hoaFee: property.hoaFee,
          gated: property.gated,
          subdivision: property.subdivision,
          appraiserUrl: property.appraiserUrl || null,
        },
        scoring_weights: sourceWeights || DEFAULT_SOURCE_WEIGHTS,
        status: 'generating',
        created_by: user?.id,
      })
      .select('id')
      .single();

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

    // =========================================================
    // STEP 2: MLS COMP SEARCH
    // =========================================================
    const subject = {
      propertySubType: property.propertySubType,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      yearBuilt: property.yearBuilt,
      lat: property.lat,
      lng: property.lng,
      zip: property.zip,
      estimatedValue: property.estimatedValue,
      estimatedRentPerSqft: null, // computed below from comps
      subdivision: property.subdivision,
      gated: property.gated,
      hoa: property.hoa,
      pool: property.pool || false,
      waterfront: property.waterfront || false,
      furnished: property.furnished || false,
      petsAllowed: property.petsAllowed || false,
      parkingSpaces: property.parkingSpaces || 0,
    };

    const mlsComps = await searchMlsComps(supabase, subject, property);

    // =========================================================
    // STEP 3: WEB SEARCH
    // =========================================================
    const { webComps, marketData, sources } = await runWebSearchPipeline({
      city: property.city,
      county: property.county,
      state: property.state || 'FL',
      zip: property.zip,
      beds: property.beds,
      propertySubType: property.propertySubType,
      subdivision: property.subdivision,
      gated: property.gated,
    });

    // =========================================================
    // STEP 4: SYNTHESIS (Appraiser-Grade)
    // =========================================================
    const weights = sourceWeights || DEFAULT_SOURCE_WEIGHTS;

    // Auto-switch to 100% web if no MLS comps
    const effectiveWeights = mlsComps.length === 0
      ? { mlsWeight: 0, webWeight: 100 }
      : weights;

    // Compute estimated rent/sqft from comp pool (for price tier scoring)
    const compRents = mlsComps.map(c => computeRentPerSqft(c)).filter(Boolean);
    if (compRents.length > 0) {
      subject.estimatedRentPerSqft = compRents.reduce((s, v) => s + v, 0) / compRents.length;
    }

    // Apply feature adjustments to each MLS comp and store on the comp object
    for (const comp of mlsComps) {
      const { adjustedRent, adjustments, totalAdjustment, rawRent } = applyFeatureAdjustments(subject, comp);
      comp._adjustedRent = adjustedRent;
      comp._adjustments = adjustments;
      comp._totalAdjustment = totalAdjustment;
      comp._rawRent = rawRent;
    }

    const rentRange = calculateRentRange(mlsComps, webComps, effectiveWeights, {
      ...marketData.trend,
      vacancy: marketData.vacancy,
    }, subject);

    // Build methodology snapshot
    const methodology = {
      similarityWeights: DEFAULT_SIMILARITY_WEIGHTS,
      dataMultipliers: DEFAULT_DATA_MULTIPLIERS,
      featureAdjustments: DEFAULT_FEATURE_ADJUSTMENTS,
      sourceWeights: effectiveWeights,
      trendData: marketData.trend,
      timestamp: new Date().toISOString(),
    };

    // MLS sources
    const mlsSources = mlsComps.map(c => ({
      url: null,
      title: `MLS #${c.listing_id || c.listing_key}`,
      quality_score: 95,
      type: 'mls',
    }));

    // =========================================================
    // STEP 5: SAVE REPORT
    // =========================================================
    const { data: updated, error: updateErr } = await supabase
      .from('rent_range_reports')
      .update({
        mls_comps: mlsComps.map(c => ({ ...c, _score: c._score })),
        web_comps: webComps,
        market_data: marketData,
        rent_range: rentRange,
        scoring_weights: effectiveWeights,
        sources: [...mlsSources, ...sources],
        methodology,
        status: 'complete',
      })
      .eq('id', report.id)
      .select('*')
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error('Rent-range report error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/rent-range — archive a report
export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, status } = await request.json();
    if (!id || !['archived', 'complete'].includes(status)) {
      return NextResponse.json({ error: 'id and status (archived|complete) required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const updates = { status };
    if (status === 'archived') updates.archived_at = new Date().toISOString();
    if (status === 'complete') updates.archived_at = null;

    const { data, error } = await supabase
      .from('rent_range_reports')
      .update(updates)
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// MLS COMP SEARCH — queries rr_rental_comps (standalone table)
// ============================================================
// Property type groups — comps should come from same group first
const TYPE_GROUPS = {
  multifamily: ['Duplex', 'Triplex', 'Quadruplex', 'Multi Family', 'Apartment'],
  attached: ['Condominium', 'Townhouse', 'Villa', 'Stock Cooperative'],
  detached: ['Single Family Residence', 'Mobile Home'],
};

function getTypeGroup(subType) {
  if (!subType) return null;
  for (const [group, types] of Object.entries(TYPE_GROUPS)) {
    if (types.some(t => subType.toLowerCase().includes(t.toLowerCase()))) return group;
  }
  return null;
}

const MIN_COMP_SCORE = 0.20; // 0-1.0 scale (v2 engine)

async function searchMlsComps(supabase, subject, property) {
  const subType = property.propertySubType || '';
  const typeGroup = getTypeGroup(subType);
  const sameGroupTypes = TYPE_GROUPS[typeGroup] || [];

  // ---- PASS 1: Same type group, county-wide (type group is the primary filter) ----
  let query = supabase
    .from('rr_rental_comps')
    .select('*')
    .eq('property_type', 'Residential Lease')
    .eq('county', property.county);

  if (sameGroupTypes.length > 0) {
    query = query.in('property_sub_type', sameGroupTypes);
  }

  if (property.beds) {
    query = query.gte('bedrooms', property.beds - 1).lte('bedrooms', property.beds + 1);
  }

  const { data: primaryComps, error } = await query
    .order('close_date', { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error('MLS comp search error:', error.message);
    return [];
  }

  let scored = (primaryComps || []).map(comp => ({
    ...comp,
    _score: scoreComp(subject, comp),
    _distance: computeDistance(subject, comp),
    _rent: getCompRent(comp),
    _rentPerSqft: computeRentPerSqft(comp),
    _typeMatch: 'same_group',
  })).filter(c => c._rent && c._rent > 0 && c._score >= MIN_COMP_SCORE);

  // ---- PASS 2: If <3 same-group comps, add other types (capped at 30% of pool) ----
  if (scored.length < 3 && sameGroupTypes.length > 0) {
    const existingKeys = new Set(scored.map(c => c.listing_key));

    const { data: otherComps } = await supabase
      .from('rr_rental_comps')
      .select('*')
      .eq('property_type', 'Residential Lease')
      .eq('county', property.county)
      .gte('bedrooms', (property.beds || 2) - 1)
      .lte('bedrooms', (property.beds || 2) + 1)
      .order('close_date', { ascending: false, nullsFirst: false })
      .limit(30);

    const additional = (otherComps || [])
      .filter(c => !existingKeys.has(c.listing_key))
      .filter(c => !sameGroupTypes.includes(c.property_sub_type))
      .map(comp => ({
        ...comp,
        _score: scoreComp(subject, comp),
        _distance: computeDistance(subject, comp),
        _rent: getCompRent(comp),
        _rentPerSqft: computeRentPerSqft(comp),
        _typeMatch: 'different_group',
      }))
      .filter(c => c._rent && c._rent > 0 && c._score >= MIN_COMP_SCORE);

    // Cap mismatched types: max 30% of total pool, minimum 2
    const sameCount = scored.length;
    const maxOther = Math.max(2, Math.ceil(sameCount * 0.43)); // 30% of total = ~43% of same
    additional.sort((a, b) => b._score - a._score);
    scored.push(...additional.slice(0, maxOther));
  }

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 15);
}
