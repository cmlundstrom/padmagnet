import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import {
  scoreComp, calculateRentRange, getCompRent, computeDistance,
  DEFAULT_COMP_WEIGHTS, DEFAULT_DATA_MULTIPLIERS, DEFAULT_SOURCE_WEIGHTS,
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
      defaults: { compWeights: DEFAULT_COMP_WEIGHTS, dataMultipliers: DEFAULT_DATA_MULTIPLIERS, sourceWeights: DEFAULT_SOURCE_WEIGHTS },
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
      lat: property.lat,
      lng: property.lng,
      estimatedValue: property.estimatedValue,
      subdivision: property.subdivision,
      gated: property.gated,
      hoa: property.hoa,
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
    // STEP 4: SYNTHESIS
    // =========================================================
    const weights = sourceWeights || DEFAULT_SOURCE_WEIGHTS;

    // Auto-switch to 100% web if no MLS comps
    const effectiveWeights = mlsComps.length === 0
      ? { mlsWeight: 0, webWeight: 100 }
      : weights;

    const rentRange = calculateRentRange(mlsComps, webComps, effectiveWeights, marketData.trend);

    // Build methodology snapshot
    const methodology = {
      compWeights: DEFAULT_COMP_WEIGHTS,
      dataMultipliers: DEFAULT_DATA_MULTIPLIERS,
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

// ============================================================
// MLS COMP SEARCH — queries rr_rental_comps (standalone table)
// ============================================================
async function searchMlsComps(supabase, subject, property) {
  const subType = (property.propertySubType || '').toLowerCase();
  const isMultiFamily = ['duplex', 'triplex', 'quadplex'].some(t => subType.includes(t));

  // Build query — property-type-aware radius
  let query = supabase
    .from('rr_rental_comps')
    .select('*')
    .eq('property_type', 'Residential Lease');

  // For multi-family: search whole county (rare property type)
  // For SFR/condo/TH: start with same zip + city
  if (isMultiFamily) {
    query = query.eq('county', property.county);
  } else {
    // Primary: same city. If not enough, we'll expand.
    query = query.eq('city', property.city);
  }

  // Bed range: exact or ±1
  if (property.beds) {
    query = query.gte('bedrooms', property.beds - 1).lte('bedrooms', property.beds + 1);
  }

  // 6-month window for closed
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];

  const { data: comps, error } = await query
    .order('close_date', { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error('MLS comp search error:', error.message);
    return [];
  }

  // Score each comp
  const scored = (comps || []).map(comp => ({
    ...comp,
    _score: scoreComp(subject, comp),
    _distance: computeDistance(subject, comp),
    _rent: getCompRent(comp),
  })).filter(c => c._rent && c._rent > 0);

  // Sort by score descending, take top 15
  scored.sort((a, b) => b._score - a._score);

  // If we have <3 comps, expand search to county level
  if (scored.length < 3 && !isMultiFamily) {
    const { data: expanded } = await supabase
      .from('rr_rental_comps')
      .select('*')
      .eq('property_type', 'Residential Lease')
      .eq('county', property.county)
      .gte('bedrooms', (property.beds || 2) - 1)
      .lte('bedrooms', (property.beds || 2) + 1)
      .order('close_date', { ascending: false, nullsFirst: false })
      .limit(50);

    const existing = new Set(scored.map(c => c.listing_key));
    const additional = (expanded || [])
      .filter(c => !existing.has(c.listing_key))
      .map(comp => ({
        ...comp,
        _score: scoreComp(subject, comp),
        _rent: getCompRent(comp),
      }))
      .filter(c => c._rent && c._rent > 0);

    scored.push(...additional);
    scored.sort((a, b) => b._score - a._score);
  }

  return scored.slice(0, 15);
}
