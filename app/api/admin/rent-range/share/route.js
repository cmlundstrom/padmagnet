/**
 * Rent-Range Report Email Share
 *
 * Sends a Gmail-optimized table-based HTML email of the rent-range report.
 * Gmail strips <style> blocks, doesn't support flexbox/grid — all inline styles + tables.
 * Max width 600px, all images as hosted URLs, total < 102KB to avoid clipping.
 *
 * Also records the share in rent_range_shares for tracking.
 */

import { createServiceClient } from '../../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const GOOGLE_KEY = process.env.GOOGLE_GEOCODING_KEY || process.env.GOOGLE_SERVER_GEOCODING_KEY;

const BRANDS = {
  sfrm: {
    name: 'South Florida Realty Management',
    logo: 'https://padmagnet.com/logo/sfrm-logo-tp.png',
    website: 'www.floridapm.net',
    phone: '(772) 220-0844',
    email: 'info@floridapm.net',
    address: '206 SW Ocean Blvd., Stuart, FL 34994',
    fromEmail: 'noreply@padmagnet.com',
    replyTo: 'info@floridapm.net',
    colors: { primary: '#344c9b', accent: '#ff7f00', green: '#0db14b', brown: '#4e342e', light: '#f8f9fa', border: '#e0e0e0' },
    tagline: 'Professional Property Management · Florida\'s Treasure Coast',
    disclaimer: 'This Rental Market Analysis is provided by South Florida Realty Management for informational purposes only and does not constitute a formal appraisal or guarantee of rental income. The estimated rent range is based on comparable market data available at the time of analysis and is subject to change. For a formal appraisal, please consult a licensed real estate appraiser.',
  },
};

// POST /api/admin/rent-range/share — email report to recipient
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { reportId, brand, firstName, lastName, email } = await request.json();

    if (!reportId || !brand || !firstName || !lastName || !email) {
      return NextResponse.json({ error: 'reportId, brand, firstName, lastName, and email are required' }, { status: 400 });
    }

    if (!BRANDS[brand]) {
      return NextResponse.json({ error: 'Invalid brand' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch report
    const { data: report, error } = await supabase
      .from('rent_range_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const brandConfig = BRANDS[brand];
    const emailHtml = buildGmailHtml(report, brandConfig, firstName);

    // Send via Resend
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: `${brandConfig.name} <${brandConfig.fromEmail}>`,
      to: email,
      cc: 'chris@floridapm.net',
      replyTo: brandConfig.replyTo,
      subject: `Rental Market Analysis — ${report.property_address}`,
      html: emailHtml,
    });

    if (sendError) {
      return NextResponse.json({ error: `Email send failed: ${sendError.message}` }, { status: 500 });
    }

    // Record the share
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('rent_range_shares').insert({
      report_id: reportId,
      first_name: firstName,
      last_name: lastName,
      email,
      brand,
      sent_by: user?.id,
    });

    return NextResponse.json({ ok: true, messageId: sendResult?.id, sentTo: email });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — fetch share history for a report
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    if (!reportId) return NextResponse.json([]);

    const supabase = createServiceClient();
    const { data } = await supabase
      .from('rent_range_shares')
      .select('*')
      .eq('report_id', reportId)
      .order('sent_at', { ascending: false });

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Build Gmail-safe HTML email.
 * Rules: ALL inline styles, table layout only, no flexbox/grid,
 * no <style> blocks, images as hosted URLs, max 600px wide.
 */
function buildGmailHtml(report, brand, firstName) {
  const c = brand.colors;
  const pd = report.property_details || {};
  const rr = report.rent_range || {};
  const mkt = report.market_data || {};
  const trend = mkt.trend || {};
  const comps = (report.mls_comps || []).slice(0, 5);
  const totalComps = (rr.compCount?.mls || 0) + (rr.compCount?.web || 0);
  const reportDate = new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  var trendText = 'Stable';
  if (trend.direction === 'rising') trendText = 'Rising' + (trend.yoyPct ? ' (+' + trend.yoyPct.toFixed(1) + '% YoY)' : '');
  if (trend.direction === 'declining') trendText = 'Declining' + (trend.yoyPct ? ' (' + trend.yoyPct.toFixed(1) + '% YoY)' : '');

  // Street View URL
  var streetViewHtml = '';
  if (GOOGLE_KEY) {
    var addr = report.property_address + ', ' + report.city + ', ' + report.state + ' ' + report.zip;
    var svUrl = 'https://maps.googleapis.com/maps/api/streetview?size=560x250&location=' + encodeURIComponent(addr) + '&fov=90&pitch=10&key=' + GOOGLE_KEY;
    streetViewHtml = '<tr><td style="padding:0 0 16px;"><img src="' + svUrl + '" alt="Property" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:6px;border:2px solid ' + c.primary + '33;" /></td></tr>';
  }

  // Comp rows
  var compRows = comps.map(function(comp, i) {
    var addr = ((comp.street_number || '') + ' ' + (comp.street_name || '')).trim() || comp.listing_id;
    var rent = Number(comp.close_price || comp.list_price || 0);
    var sqft = comp.living_area ? Number(comp.living_area).toLocaleString() : '—';
    var type = shortType(comp.property_sub_type);
    var status = comp.standard_status === 'Closed' ? 'Leased' : 'Active';
    var bg = i % 2 === 0 ? '#ffffff' : c.light;
    return '<tr style="background:' + bg + ';">'
      + '<td style="padding:8px 10px;font-size:13px;color:' + c.brown + ';border-bottom:1px solid ' + c.border + ';">' + addr + ', ' + (comp.city || '') + '</td>'
      + '<td style="padding:8px 10px;font-size:13px;color:' + c.brown + ';text-align:center;border-bottom:1px solid ' + c.border + ';">' + type + '</td>'
      + '<td style="padding:8px 10px;font-size:13px;color:' + c.brown + ';text-align:center;border-bottom:1px solid ' + c.border + ';">' + (comp.bedrooms || '—') + '/' + (comp.bathrooms || '—') + '</td>'
      + '<td style="padding:8px 10px;font-size:13px;color:' + c.brown + ';text-align:center;border-bottom:1px solid ' + c.border + ';">' + sqft + '</td>'
      + '<td style="padding:8px 10px;font-size:14px;font-weight:700;color:' + c.green + ';text-align:right;border-bottom:1px solid ' + c.border + ';">$' + rent.toLocaleString() + '</td>'
      + '<td style="padding:8px 10px;font-size:12px;color:#888;text-align:center;border-bottom:1px solid ' + c.border + ';">' + status + '</td>'
      + '</tr>';
  }).join('');

  // Market bullets
  var marketHtml = '';
  var bullets = [];
  if (mkt.vacancy != null) bullets.push('Vacancy: ' + mkt.vacancy.toFixed(1) + '%');
  if (mkt.keyDrivers && mkt.keyDrivers.length > 0) {
    for (var d = 0; d < Math.min(mkt.keyDrivers.length, 2); d++) {
      bullets.push(mkt.keyDrivers[d]);
    }
  }
  if (bullets.length > 0) {
    marketHtml = bullets.map(function(b) { return '&bull; ' + b; }).join('&nbsp;&nbsp;&nbsp;');
  }

  return '<!DOCTYPE html>'
    + '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    + '<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">'

    // Outer wrapper
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;"><tr><td align="center" style="padding:20px 10px;">'

    // Main container 600px
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #ddd;">'

    // Header — full blue with transparent PNG logo
    + '<tr><td style="background:' + c.primary + ';padding:18px 24px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td style="vertical-align:middle;"><img src="' + brand.logo + '" alt="' + brand.name + '" height="50" style="display:block;" /></td>'
    + '<td style="text-align:right;vertical-align:middle;">'
    + '<div style="font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Rental Market</div>'
    + '<div style="font-size:20px;font-weight:bold;color:' + c.accent + ';letter-spacing:-0.3px;">Analysis Report</div>'
    + '<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:3px;">' + reportDate + '</div>'
    + '</td></tr></table></td></tr>'
    + '<tr><td style="height:3px;background:' + c.accent + ';font-size:0;line-height:0;">&nbsp;</td></tr>'

    // Greeting
    + '<tr><td style="padding:20px 24px 8px;">'
    + '<div style="font-size:15px;color:' + c.brown + ';">Hi ' + firstName + ',</div>'
    + '<div style="font-size:13px;color:#666;margin-top:6px;">Here is your rental market analysis for the property below. This report provides a data-driven rent range estimate based on comparable MLS listings and market conditions.</div>'
    + '</td></tr>'

    // Street View
    + streetViewHtml

    // Subject Property
    + '<tr><td style="padding:0 24px 16px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:' + c.light + ';border:1px solid ' + c.border + ';border-radius:6px;">'
    + '<tr><td style="padding:14px 16px;">'
    + '<div style="font-size:10px;font-weight:bold;color:' + c.accent + ';text-transform:uppercase;letter-spacing:1px;">Subject Property</div>'
    + '<div style="font-size:18px;font-weight:bold;color:' + c.primary + ';margin-top:4px;">' + report.property_address + '</div>'
    + '<div style="font-size:13px;color:#666;margin-top:3px;">' + report.city + ', ' + report.state + ' ' + report.zip + ' &middot; ' + report.county + '</div>'
    + '<div style="font-size:13px;color:' + c.brown + ';margin-top:6px;">'
    + (pd.propertySubType || '—') + ' &middot; ' + (pd.beds || '—') + 'bd/' + (pd.baths || '—') + 'ba &middot; ' + (pd.sqft ? Number(pd.sqft).toLocaleString() + ' sqft' : '—') + ' &middot; Built ' + (pd.yearBuilt || '—')
    + '</div></td></tr></table></td></tr>'

    // Rent Range Hero
    + '<tr><td style="padding:0 24px 16px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:' + c.light + ';border:2px solid ' + c.primary + ';border-radius:8px;">'
    + '<tr><td style="padding:16px;text-align:center;">'
    + '<div style="font-size:10px;font-weight:bold;color:' + c.primary + ';text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Estimated Monthly Rent Range</div>'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td width="33%" style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:' + c.accent + ';">$' + (rr.low || 0).toLocaleString() + '</div><div style="font-size:10px;font-weight:bold;color:#999;">LOW</div></td>'
    + '<td width="34%" style="text-align:center;"><div style="font-size:34px;font-weight:bold;color:' + c.green + ';">$' + (rr.target || 0).toLocaleString() + '</div><div style="font-size:10px;font-weight:bold;color:' + c.green + ';">TARGET</div></td>'
    + '<td width="33%" style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:' + c.primary + ';">$' + (rr.high || 0).toLocaleString() + '</div><div style="font-size:10px;font-weight:bold;color:#999;">HIGH</div></td>'
    + '</tr></table>'
    + '<div style="margin-top:12px;font-size:12px;color:#888;">'
    + 'Confidence: <strong style="color:' + (rr.confidence >= 70 ? c.green : rr.confidence >= 40 ? c.accent : '#e53935') + ';">' + rr.confidence + '/100</strong>'
    + '&nbsp;&nbsp;&middot;&nbsp;&nbsp;Trend: <strong>' + trendText + '</strong>'
    + '&nbsp;&nbsp;&middot;&nbsp;&nbsp;Comps: <strong>' + totalComps + '</strong>'
    + '</div></td></tr></table></td></tr>'

    // Comparable Properties
    + '<tr><td style="padding:0 24px 16px;">'
    + '<div style="font-size:11px;font-weight:bold;color:' + c.primary + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Top Comparable Properties</div>'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ' + c.border + ';border-radius:4px;border-collapse:collapse;">'
    + '<tr style="background:' + c.primary + ';">'
    + '<th style="padding:8px 10px;font-size:11px;color:#fff;text-align:left;font-weight:600;">Address</th>'
    + '<th style="padding:8px 10px;font-size:11px;color:#fff;text-align:center;font-weight:600;">Type</th>'
    + '<th style="padding:8px 10px;font-size:11px;color:#fff;text-align:center;font-weight:600;">Bd/Ba</th>'
    + '<th style="padding:8px 10px;font-size:11px;color:#fff;text-align:center;font-weight:600;">Sqft</th>'
    + '<th style="padding:8px 10px;font-size:11px;color:#fff;text-align:right;font-weight:600;">Rent</th>'
    + '<th style="padding:8px 10px;font-size:11px;color:#fff;text-align:center;font-weight:600;">Status</th>'
    + '</tr>'
    + compRows
    + '</table>'
    + (totalComps > 5 ? '<div style="font-size:11px;color:#999;margin-top:6px;text-align:right;">' + totalComps + ' total comparable properties were analyzed.</div>' : '')
    + '</td></tr>'

    // Market Context
    + (marketHtml ? '<tr><td style="padding:0 24px 16px;">'
    + '<div style="background:' + c.light + ';border:1px solid ' + c.border + ';border-radius:4px;padding:10px 14px;">'
    + '<div style="font-size:10px;font-weight:bold;color:' + c.primary + ';text-transform:uppercase;margin-bottom:4px;">Market Context</div>'
    + '<div style="font-size:12px;color:' + c.brown + ';">' + marketHtml + '</div>'
    + '</div></td></tr>' : '')

    // CTA
    + '<tr><td style="padding:0 24px 20px;text-align:center;">'
    + '<div style="font-size:13px;color:' + c.brown + ';margin-bottom:12px;">Have questions about this analysis or interested in professional property management?</div>'
    + '<a href="https://' + brand.website + '" style="display:inline-block;padding:12px 28px;background:' + c.accent + ';color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px;">Contact Us Today</a>'
    + '</td></tr>'

    // Footer
    + '<tr><td style="background:' + c.light + ';padding:16px 24px;border-top:2px solid ' + c.primary + ';">'
    + '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
    + '<td>'
    + '<div style="font-size:12px;font-weight:bold;color:' + c.primary + ';">' + brand.name + '</div>'
    + '<div style="font-size:10px;color:#888;margin-top:1px;">' + brand.tagline + '</div>'
    + '<div style="font-size:10px;color:#666;margin-top:4px;">' + brand.address + '</div>'
    + '<div style="font-size:10px;color:#666;">' + brand.phone + ' &middot; ' + brand.email + ' &middot; ' + brand.website + '</div>'
    + '</td></tr></table>'
    + '<div style="font-size:9px;color:#aaa;margin-top:10px;line-height:1.4;">' + brand.disclaimer + '</div>'
    + '</td></tr>'

    + '</table>'
    + '</td></tr></table>'
    + '</body></html>';
}

function shortType(type) {
  if (!type) return '—';
  var t = type.toLowerCase();
  if (t.indexOf('single family') >= 0) return 'SFR';
  if (t.indexOf('condo') >= 0) return 'Condo';
  if (t.indexOf('townhouse') >= 0 || t.indexOf('townhome') >= 0) return 'TH';
  if (t.indexOf('duplex') >= 0) return 'Duplex';
  if (t.indexOf('triplex') >= 0) return 'Triplex';
  if (t.indexOf('quad') >= 0) return 'Quad';
  if (t.indexOf('villa') >= 0) return 'Villa';
  if (t.indexOf('apartment') >= 0) return 'Apt';
  if (t.indexOf('multi') >= 0) return 'Multi';
  return type.slice(0, 8);
}
