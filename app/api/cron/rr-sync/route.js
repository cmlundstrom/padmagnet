/**
 * Rent-Range Tool — Standalone Bridge IDX Sync
 *
 * Pulls Active + Closed rental listings into rr_rental_comps table.
 * Completely isolated from PadMagnet's listings sync.
 * Runs nightly via Vercel Cron.
 *
 * Data window: last 6 months of Closed + all current Active
 */

import { createServiceClient } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const BRIDGE_TOKEN = process.env.BRIDGE_SERVER_TOKEN;
const BRIDGE_DATASET = process.env.BRIDGE_DATASET_CODE || 'miamire';
const BRIDGE_BASE = `https://api.bridgedataoutput.com/api/v2/OData/${BRIDGE_DATASET}/Property`;

// Counties to sync — expandable
const COUNTIES = ['Martin County'];

// Fields to pull from Bridge (only what rent-range needs)
const SELECT_FIELDS = [
  'ListingKey', 'ListingId', 'StandardStatus',
  'StreetNumber', 'StreetDirPrefix', 'StreetName', 'StreetSuffix', 'StreetDirSuffix', 'UnitNumber',
  'City', 'StateOrProvince', 'PostalCode', 'CountyOrParish', 'Latitude', 'Longitude',
  'SubdivisionName', 'PropertyType', 'PropertySubType',
  'BedroomsTotal', 'BathroomsTotalInteger', 'LivingArea', 'LotSizeSquareFeet', 'YearBuilt', 'Stories',
  'ListPrice', 'ClosePrice', 'OriginalListPrice', 'PreviousListPrice',
  'OnMarketDate', 'CloseDate', 'DaysOnMarket',
  'AssociationYN', 'AssociationFee', 'CommunityFeatures',
  'PetsAllowed', 'Furnished', 'PoolPrivateYN', 'WaterfrontYN', 'ParkingTotal', 'GarageSpaces',
  'LeaseTerm', 'ListAgentFullName', 'ListOfficeName', 'ModificationTimestamp',
].join(',');

function verifyCronSecret(token) {
  if (!token || !CRON_SECRET) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(CRON_SECRET));
  } catch {
    return false;
  }
}

function mapBridgeToComp(prop) {
  return {
    listing_key: prop.ListingKey,
    listing_id: prop.ListingId,
    standard_status: prop.StandardStatus,
    street_number: prop.StreetNumber,
    street_name: [prop.StreetDirPrefix, prop.StreetName, prop.StreetSuffix, prop.StreetDirSuffix].filter(Boolean).join(' '),
    unit_number: prop.UnitNumber || null,
    city: prop.City,
    state: prop.StateOrProvince || 'FL',
    postal_code: prop.PostalCode,
    county: prop.CountyOrParish,
    latitude: prop.Latitude,
    longitude: prop.Longitude,
    subdivision_name: prop.SubdivisionName || null,
    property_type: prop.PropertyType,
    property_sub_type: prop.PropertySubType,
    bedrooms: prop.BedroomsTotal,
    bathrooms: prop.BathroomsTotalInteger,
    living_area: prop.LivingArea,
    lot_size: prop.LotSizeSquareFeet,
    year_built: prop.YearBuilt,
    stories: prop.Stories,
    list_price: prop.ListPrice,
    close_price: prop.ClosePrice,
    original_list_price: prop.OriginalListPrice,
    previous_list_price: prop.PreviousListPrice,
    on_market_date: prop.OnMarketDate,
    close_date: prop.CloseDate,
    days_on_market: prop.DaysOnMarket,
    association_yn: prop.AssociationYN || false,
    association_fee: prop.AssociationFee,
    community_features: prop.CommunityFeatures || [],
    pets_allowed: prop.PetsAllowed === 'Yes' ? true : prop.PetsAllowed === 'No' ? false : null,
    furnished: prop.Furnished === 'Furnished' ? true : prop.Furnished === 'Unfurnished' ? false : null,
    pool: prop.PoolPrivateYN || false,
    waterfront: prop.WaterfrontYN || false,
    parking_spaces: prop.GarageSpaces || prop.ParkingTotal || null,
    lease_term: prop.LeaseTerm,
    listing_agent_name: prop.ListAgentFullName,
    listing_office_name: prop.ListOfficeName,
    modification_timestamp: prop.ModificationTimestamp,
    synced_at: new Date().toISOString(),
  };
}

export async function GET(request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!verifyCronSecret(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!BRIDGE_TOKEN) {
    return NextResponse.json({ error: 'BRIDGE_SERVER_TOKEN not configured' }, { status: 500 });
  }

  const startTime = Date.now();
  const supabase = createServiceClient();
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    // 6-month lookback for Closed data
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const county of COUNTIES) {
      // Pull Active listings (current asking rents)
      const activeResults = await fetchBridgeData(county, 'Active', null);
      // Pull Closed listings (actual leased prices, last 6 months)
      const closedResults = await fetchBridgeData(county, 'Closed', sixMonthsAgo);

      const allComps = [...activeResults, ...closedResults].map(mapBridgeToComp);

      if (allComps.length > 0) {
        // Upsert in batches of 100
        for (let i = 0; i < allComps.length; i += 100) {
          const batch = allComps.slice(i, i + 100);
          const { data, error } = await supabase
            .from('rr_rental_comps')
            .upsert(batch, { onConflict: 'listing_key', ignoreDuplicates: false })
            .select('id, created_at, synced_at');

          if (error) {
            console.error(`RR sync upsert error (${county}):`, error.message);
          } else {
            for (const row of (data || [])) {
              // If created_at ≈ synced_at, it's new
              if (Math.abs(new Date(row.created_at) - new Date(row.synced_at)) < 2000) totalAdded++;
              else totalUpdated++;
            }
          }
        }
      }
    }

    // Clean up: remove Closed comps older than 6 months
    await supabase
      .from('rr_rental_comps')
      .delete()
      .eq('standard_status', 'Closed')
      .lt('close_date', sixMonthsAgo);

    const durationMs = Date.now() - startTime;

    // Log to cron_logs
    await supabase.from('cron_logs').insert({
      job_name: 'rr_sync',
      status: 'success',
      duration_ms: durationMs,
      result: { added: totalAdded, updated: totalUpdated, counties: COUNTIES.length },
    });

    return NextResponse.json({
      added: totalAdded,
      updated: totalUpdated,
      counties: COUNTIES,
      duration_ms: durationMs,
    });
  } catch (err) {
    console.error('RR sync error:', err);
    await supabase.from('cron_logs').insert({
      job_name: 'rr_sync',
      status: 'failed',
      duration_ms: Date.now() - startTime,
      error_message: err.message,
    }).catch(() => {});
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function fetchBridgeData(county, status, closeDateAfter) {
  const results = [];
  let skip = 0;
  const top = 200;

  while (true) {
    let filter = `PropertyType eq 'Residential Lease' and CountyOrParish eq '${county}' and StandardStatus eq '${status}'`;
    if (closeDateAfter) {
      filter += ` and CloseDate gt ${closeDateAfter}`;
    }

    const url = `${BRIDGE_BASE}?access_token=${BRIDGE_TOKEN}&$filter=${encodeURIComponent(filter)}&$select=${SELECT_FIELDS}&$top=${top}&$skip=${skip}&$orderby=ModificationTimestamp desc`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bridge API ${res.status} (${county} ${status}): ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const items = data.value || [];
    results.push(...items);

    if (items.length < top) break;
    skip += top;
  }

  return results;
}
