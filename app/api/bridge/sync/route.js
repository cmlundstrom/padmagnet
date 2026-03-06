import { createServiceClient } from '../../../../lib/supabase';
import { writeAuditLog } from '../../../../lib/api-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BRIDGE_TOKEN = process.env.BRIDGE_SERVER_TOKEN;
const BRIDGE_DATASET = process.env.BRIDGE_DATASET_CODE || 'miamire';
const BRIDGE_BASE = `https://api.bridgedataoutput.com/api/v2/OData/${BRIDGE_DATASET}/Property`;
const CRON_SECRET = process.env.CRON_SECRET;

const TREASURE_COAST_CITIES = [
  'Stuart', 'Port Saint Lucie', 'Port St Lucie', 'Jensen Beach',
  'Hobe Sound', 'Palm City', 'Fort Pierce', 'Indiantown', 'Tradition',
];

const SELECT_FIELDS = [
  'ListingKey', 'ListingId', 'StreetNumber', 'StreetName',
  'City', 'StateOrProvince', 'PostalCode', 'CountyOrParish',
  'Latitude', 'Longitude', 'PropertyType', 'PropertySubType',
  'ListPrice', 'BedroomsTotal', 'BathroomsTotalInteger',
  'LivingArea', 'LotSizeSquareFeet', 'YearBuilt',
  'PetsAllowed', 'Furnished', 'AssociationFee',
  'StandardStatus', 'ListAgentFullName', 'ListOfficeName',
  'ListAgentDirectPhone', 'ListAgentEmail',
  'ModificationTimestamp', 'Media',
].join(',');

function buildFilter() {
  const cityFilters = TREASURE_COAST_CITIES.map(c => `City eq '${c}'`).join(' or ');
  return `PropertyType eq 'Residential Lease' and StandardStatus eq 'Active' and (${cityFilters})`;
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
    modification_timestamp: prop.ModificationTimestamp,
    photos,
    is_active: true,
    status: 'active',
  };
}

async function fetchAllFromBridge() {
  const allProperties = [];
  let skip = 0;
  const top = 200;
  let hasMore = true;

  while (hasMore) {
    const url = `${BRIDGE_BASE}?access_token=${BRIDGE_TOKEN}&$filter=${encodeURIComponent(buildFilter())}&$top=${top}&$skip=${skip}&$orderby=ModificationTimestamp desc`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bridge API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const items = data.value || [];
    allProperties.push(...items);

    hasMore = items.length === top;
    skip += top;
  }

  return allProperties;
}

// GET handler for Vercel Cron (crons call GET)
export async function GET(request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delegate to POST handler logic
  return handleSync(request);
}

export async function POST(request) {
  // Auth: either cron secret or admin check
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

    // Fetch all rental listings from Bridge
    const properties = await fetchAllFromBridge();
    const listings = properties.map(mapBridgeToListing);

    let added = 0;
    let updated = 0;
    let skipped = 0;

    // Upsert in batches of 50
    for (let i = 0; i < listings.length; i += 50) {
      const batch = listings.slice(i, i + 50);
      const { data, error } = await supabase
        .from('listings')
        .upsert(batch, { onConflict: 'listing_key', ignoreDuplicates: false })
        .select('id, created_at, updated_at');

      if (error) {
        console.error('Upsert batch error:', error.message);
        skipped += batch.length;
        continue;
      }

      for (const row of (data || [])) {
        // If created_at equals updated_at (within 1s), it's a new insert
        const isNew = Math.abs(new Date(row.created_at) - new Date(row.updated_at)) < 1000;
        if (isNew) added++;
        else updated++;
      }
    }

    // Deactivate MLS listings not in this sync — also set status='expired'
    let deactivatedCount = 0;
    const activeKeys = listings.map(l => l.listing_key);
    if (activeKeys.length > 0) {
      const { data: deactivated } = await supabase
        .from('listings')
        .update({ is_active: false, status: 'expired' })
        .eq('source', 'mls')
        .eq('is_active', true)
        .not('listing_key', 'in', `(${activeKeys.map(k => `"${k}"`).join(',')})`)
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
      newValue: JSON.stringify({ fetched: properties.length, added, updated, deactivated: deactivatedCount }),
      adminUser: 'bridge_sync',
    });

    return NextResponse.json({
      fetched: properties.length,
      added,
      updated,
      deactivated: deactivatedCount,
      duration_ms: durationMs,
    });
  } catch (err) {
    console.error('Bridge sync error:', err);

    // Update sync log with failure
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
