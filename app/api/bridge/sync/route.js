import { createServiceClient } from '../../../../lib/supabase';
import { writeAuditLog } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BRIDGE_TOKEN = process.env.BRIDGE_SERVER_TOKEN;
const BRIDGE_DATASET = process.env.BRIDGE_DATASET_CODE || 'miamire';
const BRIDGE_BASE = `https://api.bridgedataoutput.com/api/v2/OData/${BRIDGE_DATASET}/Property`;
const CRON_SECRET = process.env.CRON_SECRET;

// Each query must stay under Bridge's 10K $skip limit.
// Miami-Dade (~10,200 listings) is split by price to keep each under 10K.
const SYNC_QUERIES = [
  { label: 'St Lucie County', filter: "CountyOrParish eq 'St Lucie County'" },
  { label: 'Martin County', filter: "CountyOrParish eq 'Martin County'" },
  { label: 'Palm Beach County', filter: "CountyOrParish eq 'Palm Beach County'" },
  { label: 'Broward County', filter: "CountyOrParish eq 'Broward County'" },
  { label: 'Miami-Dade (up to $5k)', filter: "CountyOrParish eq 'Miami-Dade County' and ListPrice le 5000" },
  { label: 'Miami-Dade (over $5k)', filter: "CountyOrParish eq 'Miami-Dade County' and ListPrice gt 5000" },
];

function buildFilter(queryFilter) {
  return `PropertyType eq 'Residential Lease' and StandardStatus eq 'Active' and ${queryFilter}`;
}

function mapBridgeToListing(prop) {
  const photos = (prop.Media || [])
    .filter(m => m.MediaCategory === 'Photo')
    .sort((a, b) => (a.Order || 0) - (b.Order || 0))
    .map(m => ({ url: m.MediaURL, caption: m.ShortDescription || '', order: m.Order || 0 }));

  return {
    listing_key: prop.ListingKey,
    listing_id: prop.ListingId,
    source: 'mls',
    street_number: prop.StreetNumber,
    street_name: prop.StreetName,
    city: prop.City,
    state_or_province: prop.StateOrProvince || 'FL',
    postal_code: prop.PostalCode,
    county: prop.CountyOrParish,
    latitude: prop.Latitude,
    longitude: prop.Longitude,
    property_type: prop.PropertyType,
    property_sub_type: prop.PropertySubType,
    list_price: prop.ListPrice,
    bedrooms_total: prop.BedroomsTotal,
    bathrooms_total: prop.BathroomsTotalInteger,
    living_area: prop.LivingArea,
    lot_size_area: prop.LotSizeSquareFeet,
    year_built: prop.YearBuilt,
    pets_allowed: prop.PetsAllowed === 'Yes' ? true : prop.PetsAllowed === 'No' ? false : null,
    furnished: prop.Furnished === 'Furnished' ? true : prop.Furnished === 'Unfurnished' ? false : null,
    hoa_fee: prop.AssociationFee,
    standard_status: prop.StandardStatus,
    listing_agent_name: prop.ListAgentFullName,
    listing_office_name: prop.ListOfficeName,
    listing_agent_phone: prop.ListAgentDirectPhone,
    listing_agent_email: prop.ListAgentEmail,
    public_remarks: prop.PublicRemarks || null,
    virtual_tour_url: prop.VirtualTourURLUnbranded || null,
    pool: prop.PoolPrivateYN === true || (Array.isArray(prop.PoolFeatures) && prop.PoolFeatures.length > 0) || null,
    parking_spaces: prop.GarageSpaces || prop.ParkingTotal || null,
    modification_timestamp: prop.ModificationTimestamp,
    photos,
    is_active: true,
    status: 'active',
  };
}

// GET handler for Vercel Cron (crons call GET)
export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handleSync(request);
}

export async function POST(request) {
  const cronHeader = request.headers.get('x-cron-secret');
  if (CRON_SECRET && cronHeader !== CRON_SECRET) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return handleSync(request);
}

async function handleSync(request) {
  const startTime = Date.now();
  let syncLogId = null;

  try {
    if (!BRIDGE_TOKEN) {
      return NextResponse.json({ error: 'BRIDGE_SERVER_TOKEN not configured' }, { status: 500 });
    }

    const supabase = createServiceClient();

    // Create sync log entry (status: running)
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({ feed_name: 'bridge', status: 'running', started_at: new Date().toISOString() })
      .select('id')
      .single();
    syncLogId = syncLog?.id;

    let added = 0;
    let updated = 0;
    let skipped = 0;
    let fetched = 0;
    const syncStartedAt = new Date().toISOString();

    // Fetch and upsert per-query to stay under Bridge's 10K $skip limit (Pro plan: 300s timeout)
    for (const query of SYNC_QUERIES) {
      let skip = 0;
      const top = 200;
      let hasMore = true;

      while (hasMore) {
        const url = `${BRIDGE_BASE}?access_token=${BRIDGE_TOKEN}&$filter=${encodeURIComponent(buildFilter(query.filter))}&$top=${top}&$skip=${skip}&$orderby=ModificationTimestamp desc`;
        const res = await fetch(url);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Bridge API ${res.status} (${query.label}): ${text.slice(0, 200)}`);
        }

        const data = await res.json();
        const items = data.value || [];
        fetched += items.length;

        // Upsert this page immediately
        if (items.length > 0) {
          const listings = items.map(mapBridgeToListing);

          const { data: rows, error } = await supabase
            .from('listings')
            .upsert(listings, { onConflict: 'listing_key', ignoreDuplicates: false })
            .select('id, created_at, updated_at');

          if (error) {
            console.error(`Upsert error (${query.label}):`, error.message);
            skipped += listings.length;
          } else {
            for (const row of (rows || [])) {
              const isNew = Math.abs(new Date(row.created_at) - new Date(row.updated_at)) < 1000;
              if (isNew) added++;
              else updated++;
            }
          }
        }

        hasMore = items.length === top;
        skip += top;
      }
    }

    // Deactivate MLS listings not touched by this sync
    // Any active MLS listing whose updated_at is older than when this sync started
    // was not in the Bridge feed — it's no longer active on the MLS
    let deactivatedCount = 0;
    if (fetched > 0) {
      const { data: deactivated } = await supabase
        .from('listings')
        .update({ is_active: false, status: 'expired' })
        .eq('source', 'mls')
        .eq('is_active', true)
        .lt('updated_at', syncStartedAt)
        .select('id');

      deactivatedCount = deactivated?.length || 0;
    }

    const durationMs = Date.now() - startTime;

    // Update sync log with results
    if (syncLogId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          listings_added: added,
          listings_updated: updated,
          listings_deactivated: deactivatedCount,
          listings_skipped: skipped,
          duration_ms: durationMs,
        })
        .eq('id', syncLogId);
    }

    await writeAuditLog({
      tableName: 'listings',
      rowId: 'bridge_sync',
      action: 'sync',
      newValue: JSON.stringify({ fetched, added, updated, deactivated: deactivatedCount }),
      adminUser: 'bridge_sync',
    });

    return NextResponse.json({
      fetched,
      added,
      updated,
      deactivated: deactivatedCount,
      duration_ms: durationMs,
    });
  } catch (err) {
    console.error('Bridge sync error:', err);

    if (syncLogId) {
      const supabase = createServiceClient();
      await supabase
        .from('sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error_message: err.message,
        })
        .eq('id', syncLogId);
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
