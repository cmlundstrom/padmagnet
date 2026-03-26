/**
 * Rent-Range Branded Report Generator
 *
 * Generates a single-page branded HTML report for a completed rent-range analysis.
 * Includes Google Street View image of subject property.
 *
 * Brands: SFRM (South Florida Realty Management), PadMagnet (future)
 */

import { createServiceClient } from '../../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const GOOGLE_KEY = process.env.GOOGLE_GEOCODING_KEY || process.env.GOOGLE_SERVER_GEOCODING_KEY;

const BRANDS = {
  sfrm: {
    name: 'South Florida Realty Management',
    logo: '/logo/sfrm-logo.jpg',
    website: 'www.floridapm.net',
    phone: '(772) 220-0844',
    email: 'info@floridapm.net',
    address: '206 SW Ocean Blvd., Stuart, FL 34994',
    colors: {
      primary: '#344c9b',    // blue
      accent: '#ff7f00',     // orange
      green: '#0db14b',      // green
      orange: '#ffa500',     // light orange
      brown: '#4e342e',      // brown (body text)
      light: '#f8f9fa',      // background
      border: '#e0e0e0',
    },
    tagline: 'Professional Property Management · Florida\'s Treasure Coast',
    disclaimer: 'This Rental Market Analysis is provided by South Florida Realty Management for informational purposes only and does not constitute a formal appraisal or guarantee of rental income. The estimated rent range is based on comparable market data available at the time of analysis and is subject to change based on market conditions, property condition, and other factors. South Florida Realty Management makes no warranties, expressed or implied, regarding the accuracy or completeness of the information herein. This report should not be used as the sole basis for any financial or investment decision. For a formal appraisal, please consult a licensed real estate appraiser.',
  },
};

// POST /api/admin/rent-range/report — generate branded report HTML
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { reportId, brand } = await request.json();

    if (!reportId || !brand || !BRANDS[brand]) {
      return NextResponse.json({ error: 'reportId and brand (sfrm) required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: report, error } = await supabase
      .from('rent_range_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status !== 'complete') {
      return NextResponse.json({ error: 'Report must be complete before generating branded version' }, { status: 400 });
    }

    const brandConfig = BRANDS[brand];
    const pd = report.property_details || {};
    const rr = report.rent_range || {};
    const mkt = report.market_data || {};
    const trend = mkt.trend || {};
    const mlsComps = (report.mls_comps || []).slice(0, 7); // up to 7 for page 2
    const page1Comps = mlsComps.slice(0, 5); // top 5 for bar chart
    const totalCompsUsed = (rr.compCount?.mls || 0) + (rr.compCount?.web || 0);

    // Get Google Street View image
    const streetViewUrl = await getVerifiedStreetViewUrl(report, pd);

    // Query rent by property type for the county (market context table)
    const { data: marketByType } = await supabase
      .from('rr_rental_comps')
      .select('property_sub_type, close_price, living_area')
      .eq('county', report.county)
      .eq('standard_status', 'Closed')
      .not('close_price', 'is', null);

    const typeStats = computeTypeStats(marketByType || []);

    // Generate HTML
    const html = generateReportHtml(report, pd, rr, mkt, trend, page1Comps, mlsComps, totalCompsUsed, brandConfig, streetViewUrl, typeStats);

    // Store in report
    const brandedReports = report.branded_reports || {};
    brandedReports[brand] = html;

    await supabase
      .from('rent_range_reports')
      .update({ branded_reports: brandedReports })
      .eq('id', reportId);

    return NextResponse.json({ html, brand });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getVerifiedStreetViewUrl(report, pd) {
  if (!GOOGLE_KEY) return null;

  const address = `${report.property_address}, ${report.city}, ${report.state} ${report.zip}`;
  const lat = pd.lat;
  const lng = pd.lng;
  const location = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(address);

  // Try Street View Static API first
  const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${location}&fov=90&pitch=10&key=${GOOGLE_KEY}`;
  try {
    const res = await fetch(svUrl, { method: 'HEAD' });
    if (res.ok && res.headers.get('content-type')?.includes('image')) {
      return svUrl;
    }
  } catch { /* silent */ }

  // Fallback: Maps Static API (satellite view)
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location}&zoom=18&size=600x300&maptype=satellite&key=${GOOGLE_KEY}`;
  try {
    const res = await fetch(mapUrl, { method: 'HEAD' });
    if (res.ok && res.headers.get('content-type')?.includes('image')) {
      return mapUrl;
    }
  } catch { /* silent */ }

  // Neither API available — return null (report renders without image)
  return null;
}

function computeTypeStats(comps) {
  const grouped = {};
  for (const c of comps) {
    const type = c.property_sub_type || 'Unknown';
    if (!grouped[type]) grouped[type] = { rents: [], sqfts: [] };
    if (c.close_price) grouped[type].rents.push(Number(c.close_price));
    if (c.living_area) grouped[type].sqfts.push(Number(c.living_area));
  }
  return Object.entries(grouped)
    .map(([type, data]) => ({
      type,
      count: data.rents.length,
      medianRent: median(data.rents),
      avgSqft: data.sqfts.length > 0 ? Math.round(data.sqfts.reduce((s, v) => s + v, 0) / data.sqfts.length) : null,
      rentPerSqft: data.rents.length > 0 && data.sqfts.length > 0
        ? Math.round((median(data.rents) / (data.sqfts.reduce((s, v) => s + v, 0) / data.sqfts.length)) * 100) / 100
        : null,
    }))
    .filter(t => t.count >= 2)
    .sort((a, b) => b.count - a.count);
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function generateReportHtml(report, pd, rr, mkt, trend, page1Comps, allComps, totalCompsUsed, brand, streetViewUrl, typeStats) {
  const c = brand.colors;
  const reportDate = new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const appraiserUrl = pd.appraiserUrl || '';

  const trendText = trend.direction === 'rising'
    ? `↗ Rising${trend.yoyPct ? ` (+${trend.yoyPct.toFixed(1)}% YoY)` : ''}`
    : trend.direction === 'declining'
    ? `↘ Declining${trend.yoyPct ? ` (${trend.yoyPct.toFixed(1)}% YoY)` : ''}`
    : '→ Stable';

  // Compute max rent for bar chart scaling
  const allRents = page1Comps.map(comp => Number(comp.close_price || comp.list_price || 0));
  const maxRent = Math.max(...allRents, rr.high || 0, 1);

  // Bar chart for page 1 comps
  const compBarsHtml = page1Comps.map((comp, i) => {
    const addr = `${comp.street_number || ''} ${comp.street_name || ''}`.trim() || comp.listing_id;
    const rent = Number(comp.close_price || comp.list_price || 0);
    const pct = Math.round((rent / maxRent) * 100);
    const barColor = i === 0 ? c.green : i === 1 ? c.primary : c.accent;
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="width:130px;font-size:9px;color:${c.brown};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;">${addr}</div>
      <div style="flex:1;background:#eee;border-radius:3px;height:16px;position:relative;">
        <div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px;"></div>
        <div style="position:absolute;left:${Math.min(pct + 1, 85)}%;top:1px;font-size:9px;font-weight:700;color:${c.brown};">$${rent.toLocaleString()}</div>
      </div>
    </div>`;
  }).join('');

  // Subject range overlay bar
  const lowPct = Math.round(((rr.low || 0) / maxRent) * 100);
  const highPct = Math.round(((rr.high || 0) / maxRent) * 100);
  const targetPct = Math.round(((rr.target || 0) / maxRent) * 100);

  // Page 2 comps table
  const compsTableHtml = allComps.map((comp, i) => {
    const addr = `${comp.street_number || ''} ${comp.street_name || ''}`.trim() || comp.listing_id;
    const rent = Number(comp.close_price || comp.list_price || 0);
    const rentSqft = comp.living_area ? (rent / Number(comp.living_area)).toFixed(2) : '—';
    const dist = comp._distance != null ? `${comp._distance} mi` : '—';
    const bg = i % 2 === 0 ? '#fff' : c.light;
    return `<tr style="background:${bg};">
      <td style="padding:5px 6px;font-size:10px;color:${c.brown};border-bottom:1px solid ${c.border};">${String.fromCharCode(65 + i)}</td>
      <td style="padding:5px 6px;font-size:10px;color:${c.brown};border-bottom:1px solid ${c.border};">${addr}, ${comp.city || ''}</td>
      <td style="padding:5px 6px;font-size:10px;text-align:center;border-bottom:1px solid ${c.border};">${shortTypeLabel(comp.property_sub_type)}</td>
      <td style="padding:5px 6px;font-size:10px;text-align:center;border-bottom:1px solid ${c.border};">${comp.bedrooms || '—'}/${comp.bathrooms || '—'}</td>
      <td style="padding:5px 6px;font-size:10px;text-align:center;border-bottom:1px solid ${c.border};">${comp.living_area ? Number(comp.living_area).toLocaleString() : '—'}</td>
      <td style="padding:5px 6px;font-size:10px;text-align:center;border-bottom:1px solid ${c.border};">${comp.year_built || '—'}</td>
      <td style="padding:5px 6px;font-size:10px;text-align:center;border-bottom:1px solid ${c.border};">${dist}</td>
      <td style="padding:5px 6px;font-size:10px;text-align:right;font-weight:700;color:${c.green};border-bottom:1px solid ${c.border};">$${rent.toLocaleString()}</td>
      <td style="padding:5px 6px;font-size:10px;text-align:right;color:${c.accent};border-bottom:1px solid ${c.border};">$${rentSqft}</td>
      <td style="padding:5px 6px;font-size:9px;text-align:center;color:#888;border-bottom:1px solid ${c.border};">${comp.standard_status === 'Closed' ? 'Leased' : 'Active'}</td>
    </tr>`;
  }).join('');

  // $/sqft bar chart for page 2
  const sqftBars = allComps.filter(c => c.living_area && (c.close_price || c.list_price)).map((comp, i) => {
    const rent = Number(comp.close_price || comp.list_price);
    const rsf = rent / Number(comp.living_area);
    return { label: String.fromCharCode(65 + i), rsf };
  });
  const maxRsf = Math.max(...sqftBars.map(b => b.rsf), 1);
  const sqftBarsHtml = sqftBars.map(b => {
    const pct = Math.round((b.rsf / maxRsf) * 100);
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
      <span style="width:16px;font-size:9px;font-weight:700;color:${c.primary};text-align:right;">${b.label}</span>
      <div style="flex:1;background:#eee;border-radius:2px;height:12px;">
        <div style="width:${pct}%;height:100%;background:${c.accent};border-radius:2px;"></div>
      </div>
      <span style="font-size:9px;font-weight:600;color:${c.brown};width:40px;">$${b.rsf.toFixed(2)}</span>
    </div>`;
  }).join('');

  // Type stats table
  const typeTableHtml = typeStats.slice(0, 6).map((t, i) => {
    const bg = i % 2 === 0 ? '#fff' : c.light;
    return `<tr style="background:${bg};">
      <td style="padding:4px 8px;font-size:10px;border-bottom:1px solid ${c.border};">${t.type}</td>
      <td style="padding:4px 8px;font-size:10px;text-align:right;font-weight:600;color:${c.green};border-bottom:1px solid ${c.border};">$${t.medianRent.toLocaleString()}</td>
      <td style="padding:4px 8px;font-size:10px;text-align:right;border-bottom:1px solid ${c.border};">${t.avgSqft ? t.avgSqft.toLocaleString() : '—'}</td>
      <td style="padding:4px 8px;font-size:10px;text-align:right;color:${c.accent};border-bottom:1px solid ${c.border};">${t.rentPerSqft ? `$${t.rentPerSqft}` : '—'}</td>
      <td style="padding:4px 8px;font-size:10px;text-align:center;color:#888;border-bottom:1px solid ${c.border};">${t.count}</td>
    </tr>`;
  }).join('');

  // Market context bullets
  const marketBullets = [];
  if (mkt.vacancy != null) marketBullets.push(`Vacancy rate: ${mkt.vacancy.toFixed(1)}%${mkt.vacancy < 5 ? ' (tight market)' : mkt.vacancy < 8 ? ' (moderate)' : ' (soft market)'}`);
  if (mkt.keyDrivers?.length > 0) marketBullets.push(...mkt.keyDrivers.slice(0, 3));
  if (trend.direction) marketBullets.push(`Rental trend: ${trendText}`);

  // Sources
  const sources = (report.sources || []).filter(s => s.quality_score >= 50).slice(0, 6);

  const headerHtml = `<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:3px solid ${c.primary};margin-bottom:14px;">
  <img src="${brand.logo}" alt="${brand.name}" style="height:48px;" />
  <div style="text-align:right;">
    <div style="font-size:16px;font-weight:800;color:${c.primary};letter-spacing:-0.02em;">Rental Property</div>
    <div style="font-size:12px;font-weight:600;color:${c.accent};">Analysis Report</div>
  </div>
</div>`;

  const addressBlockHtml = `<div style="font-size:9px;color:#666;margin-bottom:14px;text-align:right;">
  ${report.property_address.toUpperCase()}<br/>
  ${report.city ? report.city.toUpperCase() + ', ' : ''}${report.state} ${report.zip}
</div>`;

  const footerHtml = `<div style="border-top:2px solid ${c.primary};padding-top:8px;display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <div style="font-size:10px;font-weight:700;color:${c.primary};">${brand.name}</div>
    <div style="font-size:8px;color:#888;">${brand.tagline}</div>
    <div style="font-size:8px;color:#666;margin-top:2px;">${brand.address}</div>
    <div style="font-size:8px;color:#666;">${brand.phone} · ${brand.email} · ${brand.website}</div>
  </div>
  <div style="text-align:right;max-width:55%;">
    <div style="font-size:6.5px;color:#aaa;line-height:1.3;">${brand.disclaimer}</div>
  </div>
</div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Rental Property Analysis — ${report.property_address}</title>
<style>
  @page { size: letter; margin: 0.35in 0.4in; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page-break { page-break-before: always; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: ${c.brown}; background: #fff; max-width: 8.5in; margin: 0 auto; }
  .page { padding: 0.35in 0.4in; min-height: 10.2in; position: relative; }
  .page-footer { position: absolute; bottom: 0.35in; left: 0.4in; right: 0.4in; }
</style>
</head>
<body>

<!-- ==================== PAGE 1 ==================== -->
<div class="page">
${headerHtml}

<!-- Subject Property + Street View -->
<div style="display:flex;gap:14px;margin-bottom:14px;">
  ${streetViewUrl ? `<div style="flex-shrink:0;"><img src="${streetViewUrl}" alt="Property" style="width:240px;height:155px;object-fit:cover;border-radius:6px;border:2px solid ${c.primary}33;" /></div>` : ''}
  <div style="flex:1;">
    <div style="font-size:8px;font-weight:700;color:${c.accent};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Subject Property</div>
    <div style="font-size:17px;font-weight:800;color:${c.primary};line-height:1.2;">${report.property_address}</div>
    <div style="font-size:11px;color:#666;margin-top:3px;">${report.city}, ${report.state} ${report.zip} · ${report.county}</div>
    ${appraiserUrl ? `<div style="font-size:8px;margin-top:3px;"><a href="${appraiserUrl}" style="color:${c.primary};text-decoration:none;">County Appraiser Record ↗</a></div>` : ''}
    <!-- Property Details Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-top:10px;padding:8px 10px;background:${c.light};border-radius:4px;border:1px solid ${c.border};">
      <div style="font-size:9px;"><strong style="color:${c.primary};">Type:</strong> ${pd.propertySubType || '—'}</div>
      <div style="font-size:9px;"><strong style="color:${c.primary};">Year Built:</strong> ${pd.yearBuilt || '—'}</div>
      <div style="font-size:9px;"><strong style="color:${c.primary};">Beds/Baths:</strong> ${pd.beds || '—'} / ${pd.baths || '—'}</div>
      <div style="font-size:9px;"><strong style="color:${c.primary};">Sqft:</strong> ${pd.sqft ? Number(pd.sqft).toLocaleString() : '—'}</div>
      <div style="font-size:9px;"><strong style="color:${c.primary};">HOA:</strong> ${pd.hoa ? `$${pd.hoaFee || '—'}/mo` : 'None'}</div>
      <div style="font-size:9px;"><strong style="color:${c.primary};">Pool:</strong> ${pd.pool ? 'Yes' : 'No'}${pd.gated ? ' · <strong>Gated</strong>' : ''}</div>
    </div>
  </div>
</div>

<!-- Rent Range Hero -->
<div style="background:linear-gradient(135deg, ${c.primary}08, ${c.green}08);border:2px solid ${c.primary};border-radius:8px;padding:14px 20px;text-align:center;margin-bottom:12px;">
  <div style="font-size:8px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Estimated Monthly Rent Range</div>
  <!-- Range Bar -->
  <div style="position:relative;height:32px;background:#eee;border-radius:4px;margin:0 60px 8px;">
    <div style="position:absolute;left:${lowPct}%;width:${highPct - lowPct}%;height:100%;background:${c.green}22;border-radius:4px;border:1px solid ${c.green}44;"></div>
    <div style="position:absolute;left:${targetPct}%;top:0;bottom:0;width:3px;background:${c.green};border-radius:2px;transform:translateX(-1px);"></div>
  </div>
  <div style="display:flex;justify-content:center;align-items:baseline;gap:24px;">
    <div><div style="font-size:22px;font-weight:800;color:${c.accent};">$${(rr.low || 0).toLocaleString()}</div><div style="font-size:8px;font-weight:700;color:#999;">LOW</div></div>
    <div style="color:#ccc;">—</div>
    <div><div style="font-size:30px;font-weight:800;color:${c.green};">$${(rr.target || 0).toLocaleString()}</div><div style="font-size:8px;font-weight:700;color:${c.green};">TARGET</div></div>
    <div style="color:#ccc;">—</div>
    <div><div style="font-size:22px;font-weight:800;color:${c.primary};">$${(rr.high || 0).toLocaleString()}</div><div style="font-size:8px;font-weight:700;color:#999;">HIGH</div></div>
  </div>
</div>

<!-- Middle Row: Confidence + Stats + Market -->
<div style="display:flex;gap:12px;margin-bottom:12px;">
  <!-- Confidence -->
  <div style="flex:1;background:${c.light};border-radius:6px;border:1px solid ${c.border};padding:10px;text-align:center;">
    <div style="font-size:8px;font-weight:700;color:${c.primary};text-transform:uppercase;margin-bottom:6px;">Confidence Score</div>
    <div style="font-size:28px;font-weight:800;color:${rr.confidence >= 70 ? c.green : rr.confidence >= 40 ? c.accent : '#e53935'};">${rr.confidence}</div>
    <div style="font-size:9px;color:#999;">out of 100</div>
    <div style="margin-top:6px;height:6px;background:#eee;border-radius:3px;">
      <div style="width:${rr.confidence}%;height:100%;background:${rr.confidence >= 70 ? c.green : rr.confidence >= 40 ? c.accent : '#e53935'};border-radius:3px;"></div>
    </div>
  </div>
  <!-- Key Stats -->
  <div style="flex:1;background:${c.light};border-radius:6px;border:1px solid ${c.border};padding:10px;">
    <div style="font-size:8px;font-weight:700;color:${c.primary};text-transform:uppercase;margin-bottom:6px;">Analysis Summary</div>
    <div style="font-size:9px;line-height:1.7;color:${c.brown};">
      <div>MLS Comps Used: <strong>${rr.compCount?.mls || 0}</strong></div>
      <div>Web Sources: <strong>${rr.compCount?.web || 0}</strong></div>
      <div>Total Analyzed: <strong>${totalCompsUsed}</strong></div>
      <div>Market Trend: <strong>${trendText}</strong></div>
      <div>Report Date: <strong>${reportDate}</strong></div>
    </div>
  </div>
  <!-- Market Snapshot -->
  <div style="flex:1;background:${c.light};border-radius:6px;border:1px solid ${c.border};padding:10px;">
    <div style="font-size:8px;font-weight:700;color:${c.primary};text-transform:uppercase;margin-bottom:6px;">Market Snapshot</div>
    <div style="font-size:9px;line-height:1.7;color:${c.brown};">
      ${marketBullets.length > 0 ? marketBullets.map(b => `<div>• ${b}</div>`).join('') : '<div style="color:#999;">Market data not available</div>'}
    </div>
  </div>
</div>

<!-- Rent Comparison Bar Chart -->
<div style="margin-bottom:12px;">
  <div style="font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Rent Comparison — Top Comparable Properties</div>
  <div style="background:${c.light};border:1px solid ${c.border};border-radius:6px;padding:10px 12px;">
    ${compBarsHtml}
    <!-- Subject range indicator -->
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;padding-top:6px;border-top:1px solid ${c.border};">
      <div style="width:130px;font-size:9px;color:${c.green};font-weight:700;text-align:right;">Subject Range</div>
      <div style="flex:1;background:#eee;border-radius:3px;height:16px;position:relative;">
        <div style="position:absolute;left:${lowPct}%;width:${highPct - lowPct}%;height:100%;background:${c.green}33;border:1px solid ${c.green};border-radius:3px;"></div>
        <div style="position:absolute;left:${targetPct}%;top:-2px;bottom:-2px;width:2px;background:${c.green};"></div>
      </div>
    </div>
  </div>
</div>

<!-- Page 1 Footer -->
<div class="page-footer">${footerHtml}<div style="text-align:center;font-size:8px;color:#ccc;margin-top:6px;">Page 1 of 2</div></div>
</div>

<!-- ==================== PAGE 2 ==================== -->
<div class="page page-break">
${headerHtml}
${addressBlockHtml}

<!-- Full Comparable Properties Table -->
<div style="margin-bottom:14px;">
  <div style="font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Comparable For-Rent Properties</div>
  <table style="width:100%;border-collapse:collapse;border:1px solid ${c.border};">
    <thead>
      <tr style="background:${c.primary};color:#fff;">
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:left;width:16px;"></th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:left;">Address</th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:center;">Type</th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:center;">Bd/Ba</th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:center;">Sqft</th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:center;">Year</th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:center;">Dist.</th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:right;">Rent</th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:right;">$/SF</th>
        <th style="padding:5px 6px;font-size:9px;font-weight:600;text-align:center;">Status</th>
      </tr>
    </thead>
    <tbody>${compsTableHtml}</tbody>
  </table>
  <div style="font-size:8px;color:#999;margin-top:3px;text-align:right;">${totalCompsUsed} total comparable properties were analyzed. Top ${allComps.length} shown.</div>
</div>

<!-- Two-column: $/sqft chart + Rent by Type -->
<div style="display:flex;gap:14px;margin-bottom:14px;">
  <!-- $/sqft Comparison -->
  <div style="flex:1;">
    <div style="font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Rent Per Square Foot Comparison</div>
    <div style="background:${c.light};border:1px solid ${c.border};border-radius:6px;padding:10px;">
      ${sqftBarsHtml}
    </div>
  </div>
  <!-- Rent by Property Type -->
  <div style="flex:1;">
    <div style="font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Median Rent by Property Type — ${report.county}</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid ${c.border};">
      <thead>
        <tr style="background:${c.primary};color:#fff;">
          <th style="padding:4px 8px;font-size:8px;font-weight:600;text-align:left;">Type</th>
          <th style="padding:4px 8px;font-size:8px;font-weight:600;text-align:right;">Median Rent</th>
          <th style="padding:4px 8px;font-size:8px;font-weight:600;text-align:right;">Avg Sqft</th>
          <th style="padding:4px 8px;font-size:8px;font-weight:600;text-align:right;">$/SF</th>
          <th style="padding:4px 8px;font-size:8px;font-weight:600;text-align:center;">#</th>
        </tr>
      </thead>
      <tbody>${typeTableHtml}</tbody>
    </table>
  </div>
</div>

<!-- Data Sources -->
<div style="margin-bottom:14px;">
  <div style="font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Data Sources</div>
  <div style="background:${c.light};border:1px solid ${c.border};border-radius:4px;padding:8px 10px;font-size:9px;color:${c.brown};line-height:1.6;">
    <div><strong>MLS/IDX Data:</strong> Bridge Interactive (MIAMIRE dataset) — Active and Closed rental listings</div>
    <div><strong>County Records:</strong> ${report.county} Property Appraiser${appraiserUrl ? ` (<a href="${appraiserUrl}" style="color:${c.primary};">${appraiserUrl}</a>)` : ''}</div>
    ${sources.length > 0 ? `<div style="margin-top:4px;"><strong>Web Sources:</strong> ${sources.map(s => {
      const domain = s.url ? s.url.replace(/^https?:\\/\\/(www\\.)?/, '').split('/')[0] : s.title;
      return s.url ? `<a href="${s.url}" style="color:${c.primary};text-decoration:none;">${domain}</a>` : domain;
    }).join(' · ')}</div>` : ''}
    <div style="margin-top:4px;font-size:8px;color:#999;">Rental comparables are collected from a national network of strategic resources including MLS/IDX feeds, property management databases, real estate technology providers, and public web data. Information is acquired in accordance with the resource terms of use and/or licensed data-usage agreements.</div>
  </div>
</div>

<!-- Page 2 Footer -->
<div class="page-footer">${footerHtml}<div style="text-align:center;font-size:8px;color:#ccc;margin-top:6px;">Page 2 of 2</div></div>
</div>

</body>
</html>`;
}

function shortTypeLabel(type) {
  if (!type) return '—';
  const t = type.toLowerCase();
  if (t.includes('single family')) return 'SFR';
  if (t.includes('condo') || t.includes('cooperative')) return 'Condo';
  if (t.includes('townhouse') || t.includes('townhome')) return 'TH';
  if (t.includes('duplex')) return 'Duplex';
  if (t.includes('triplex')) return 'Triplex';
  if (t.includes('quad')) return 'Quad';
  if (t.includes('villa')) return 'Villa';
  if (t.includes('apartment')) return 'Apt';
  if (t.includes('multi')) return 'Multi';
  return type.slice(0, 8);
}
