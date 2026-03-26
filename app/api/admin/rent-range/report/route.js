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

const GOOGLE_KEY = process.env.GOOGLE_SERVER_GEOCODING_KEY || process.env.GOOGLE_GEOCODING_KEY;

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
    const mlsComps = (report.mls_comps || []).slice(0, 3);
    const totalCompsUsed = (rr.compCount?.mls || 0) + (rr.compCount?.web || 0);

    // Get Google Street View image — verify it's available before including
    const streetViewUrl = await getVerifiedStreetViewUrl(report, pd);

    // Generate HTML
    const html = generateReportHtml(report, pd, rr, mkt, trend, mlsComps, totalCompsUsed, brandConfig, streetViewUrl);

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

function generateReportHtml(report, pd, rr, mkt, trend, comps, totalCompsUsed, brand, streetViewUrl) {
  const c = brand.colors;
  const reportDate = new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const appraiserUrl = pd.appraiserUrl || '';

  const trendText = trend.direction === 'rising'
    ? `↗ Rising${trend.yoyPct ? ` (+${trend.yoyPct.toFixed(1)}% YoY)` : ''}`
    : trend.direction === 'declining'
    ? `↘ Declining${trend.yoyPct ? ` (${trend.yoyPct.toFixed(1)}% YoY)` : ''}`
    : '→ Stable';

  const compsHtml = comps.map((comp, i) => {
    const addr = `${comp.street_number || ''} ${comp.street_name || ''}`.trim() || comp.listing_id;
    const rent = comp.close_price || comp.list_price || 0;
    const status = comp.standard_status === 'Closed' ? 'Leased' : 'Active';
    const subType = shortTypeLabel(comp.property_sub_type);
    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid ${c.border};font-size:11px;color:${c.brown};">${addr}, ${comp.city || ''}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${c.border};font-size:11px;color:${c.brown};text-align:center;">${subType}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${c.border};font-size:11px;color:${c.brown};text-align:center;">${comp.bedrooms || '—'}/${comp.bathrooms || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${c.border};font-size:11px;color:${c.brown};text-align:center;">${comp.living_area ? Number(comp.living_area).toLocaleString() : '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${c.border};font-size:11px;color:${c.green};font-weight:700;text-align:right;">$${rent.toLocaleString()}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${c.border};font-size:10px;color:#888;text-align:center;">${status}</td>
      </tr>`;
  }).join('');

  const marketBullets = [];
  if (mkt.vacancy != null) marketBullets.push(`Vacancy rate: ${mkt.vacancy.toFixed(1)}%${mkt.vacancy < 5 ? ' (tight market)' : mkt.vacancy < 8 ? ' (moderate)' : ' (soft market)'}`);
  if (mkt.keyDrivers?.length > 0) marketBullets.push(...mkt.keyDrivers.slice(0, 2));
  const marketHtml = marketBullets.length > 0
    ? marketBullets.map(b => `<span style="display:inline-block;margin-right:16px;font-size:10px;color:${c.brown};">• ${b}</span>`).join('')
    : `<span style="font-size:10px;color:#999;">Market data not available for this report period.</span>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rental Market Analysis — ${report.property_address}</title>
<style>
  @page { size: letter; margin: 0.4in; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: ${c.brown}; background: #fff; }
</style>
</head>
<body style="max-width:8.5in;margin:0 auto;padding:0.4in;">

<!-- HEADER -->
<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:3px solid ${c.primary};margin-bottom:16px;">
  <img src="${brand.logo}" alt="${brand.name}" style="height:52px;" />
  <div style="text-align:right;">
    <div style="font-size:18px;font-weight:800;color:${c.primary};letter-spacing:-0.02em;">Rental Market Analysis</div>
    <div style="font-size:10px;color:#888;margin-top:2px;">${reportDate}</div>
  </div>
</div>

<!-- SUBJECT PROPERTY + STREET VIEW -->
<div style="display:flex;gap:16px;margin-bottom:14px;">
  ${streetViewUrl ? `<div style="flex-shrink:0;"><img src="${streetViewUrl}" alt="Street View" style="width:220px;height:130px;object-fit:cover;border-radius:6px;border:2px solid ${c.border};" /></div>` : ''}
  <div style="flex:1;">
    <div style="font-size:9px;font-weight:700;color:${c.accent};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Subject Property</div>
    <div style="font-size:16px;font-weight:800;color:${c.primary};line-height:1.2;">${report.property_address}</div>
    <div style="font-size:11px;color:#666;margin-top:3px;">${report.city}, ${report.state} ${report.zip} · ${report.county}</div>
    <div style="font-size:11px;color:${c.brown};margin-top:6px;">
      ${pd.propertySubType || '—'} · ${pd.beds || '—'}bd / ${pd.baths || '—'}ba · ${pd.sqft ? Number(pd.sqft).toLocaleString() + ' sqft' : '—'} · Built ${pd.yearBuilt || '—'}
      ${pd.hoa ? ` · HOA $${pd.hoaFee || '—'}/mo` : ''}${pd.gated ? ' · Gated' : ''}
    </div>
    ${appraiserUrl ? `<div style="font-size:9px;margin-top:4px;"><a href="${appraiserUrl}" style="color:${c.primary};text-decoration:none;">County Appraiser Record ↗</a></div>` : ''}
  </div>
</div>

<!-- RENT RANGE — THE HERO -->
<div style="background:${c.light};border:2px solid ${c.primary};border-radius:8px;padding:16px 20px;text-align:center;margin-bottom:14px;">
  <div style="font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Estimated Monthly Rent Range</div>
  <div style="display:flex;justify-content:center;align-items:baseline;gap:20px;">
    <div>
      <div style="font-size:24px;font-weight:800;color:${c.accent};">$${(rr.low || 0).toLocaleString()}</div>
      <div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;">Low</div>
    </div>
    <div style="font-size:14px;color:#ccc;">—</div>
    <div>
      <div style="font-size:32px;font-weight:800;color:${c.green};">$${(rr.target || 0).toLocaleString()}</div>
      <div style="font-size:9px;font-weight:700;color:${c.green};text-transform:uppercase;">Target</div>
    </div>
    <div style="font-size:14px;color:#ccc;">—</div>
    <div>
      <div style="font-size:24px;font-weight:800;color:${c.primary};">$${(rr.high || 0).toLocaleString()}</div>
      <div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;">High</div>
    </div>
  </div>
  <div style="display:flex;justify-content:center;gap:24px;margin-top:10px;font-size:10px;color:#888;">
    <span>Confidence: <strong style="color:${rr.confidence >= 70 ? c.green : rr.confidence >= 40 ? c.accent : '#e53935'};">${rr.confidence}/100</strong></span>
    <span>Trend: <strong>${trendText}</strong></span>
    <span>MLS Comps: <strong>${rr.compCount?.mls || 0}</strong> · Web: <strong>${rr.compCount?.web || 0}</strong></span>
  </div>
</div>

<!-- COMPARABLE PROPERTIES -->
<div style="margin-bottom:12px;">
  <div style="font-size:10px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Top Comparable Properties</div>
  <table style="width:100%;border-collapse:collapse;border:1px solid ${c.border};border-radius:4px;">
    <thead>
      <tr style="background:${c.primary};color:#fff;">
        <th style="padding:6px 8px;font-size:10px;text-align:left;font-weight:600;">Address</th>
        <th style="padding:6px 8px;font-size:10px;text-align:center;font-weight:600;">Type</th>
        <th style="padding:6px 8px;font-size:10px;text-align:center;font-weight:600;">Bd/Ba</th>
        <th style="padding:6px 8px;font-size:10px;text-align:center;font-weight:600;">Sqft</th>
        <th style="padding:6px 8px;font-size:10px;text-align:right;font-weight:600;">Rent</th>
        <th style="padding:6px 8px;font-size:10px;text-align:center;font-weight:600;">Status</th>
      </tr>
    </thead>
    <tbody>${compsHtml}</tbody>
  </table>
  ${totalCompsUsed > 3 ? `<div style="font-size:9px;color:#999;margin-top:4px;text-align:right;">${totalCompsUsed} total comparable properties were analyzed for this report.</div>` : ''}
</div>

<!-- MARKET CONTEXT -->
<div style="margin-bottom:14px;padding:8px 12px;background:${c.light};border-radius:4px;border:1px solid ${c.border};">
  <div style="font-size:9px;font-weight:700;color:${c.primary};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Market Context</div>
  ${marketHtml}
</div>

<!-- FOOTER -->
<div style="border-top:2px solid ${c.primary};padding-top:10px;display:flex;justify-content:space-between;align-items:flex-start;">
  <div>
    <div style="font-size:11px;font-weight:700;color:${c.primary};">${brand.name}</div>
    <div style="font-size:9px;color:#888;margin-top:1px;">${brand.tagline}</div>
    <div style="font-size:9px;color:#666;margin-top:3px;">${brand.address}</div>
    <div style="font-size:9px;color:#666;">${brand.phone} · ${brand.email} · ${brand.website}</div>
  </div>
  <div style="text-align:right;max-width:55%;">
    <div style="font-size:7px;color:#aaa;line-height:1.4;">${brand.disclaimer}</div>
  </div>
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
