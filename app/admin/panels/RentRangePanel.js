'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS, Badge, StatCard, baseButton, timeAgo, formatDate } from '../shared';
import { createSupabaseBrowser } from '../../../lib/supabase-browser';

const PROPERTY_TYPES = [
  { value: 'Single Family Residence', label: 'Single Family Home' },
  { value: 'Condominium', label: 'Condo' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Duplex', label: 'Duplex' },
  { value: 'Triplex', label: 'Triplex' },
  { value: 'Quadruplex', label: 'Quadplex' },
];

export default function RentRangePanel() {
  // Page state: 'form' | 'generating' | 'report' | 'list'
  const [view, setView] = useState('list');
  const [reports, setReports] = useState([]);
  const [compStats, setCompStats] = useState({});
  const [countyAppraisers, setCountyAppraisers] = useState({});
  const [defaults, setDefaults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeResults, setScrapeResults] = useState(null); // for multi-unit selection

  // Form state
  const [form, setForm] = useState({
    address: '', city: '', state: 'FL', zip: '', county: 'Martin County',
    propertySubType: 'Single Family Residence',
    beds: '', baths: '', sqft: '', yearBuilt: '',
    hoa: false, hoaFee: '', gated: false, subdivision: '',
    lat: null, lng: null, appraiserUrl: '',
  });
  const [mlsWeight, setMlsWeight] = useState(70);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [expandedComp, setExpandedComp] = useState(null);

  // Google Places autocomplete
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/rent-range');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setCompStats(data.compStats || {});
        setCountyAppraisers(data.countyAppraisers || {});
        setDefaults(data.defaults || null);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Apply scraped property data to ALL form fields
  function applyScrapedData(data) {
    setForm(f => ({
      ...f,
      // Address fields
      address: data.address || f.address,
      city: data.city || f.city,
      state: data.state || f.state,
      zip: data.zip || f.zip,
      county: data.county || f.county,
      lat: data.lat || f.lat,
      lng: data.lng || f.lng,
      // Property details
      propertySubType: data.propertySubType || f.propertySubType,
      beds: data.beds != null ? String(data.beds) : f.beds,
      baths: data.baths != null ? String(data.baths) : f.baths,
      sqft: data.sqft != null ? String(data.sqft) : f.sqft,
      yearBuilt: data.yearBuilt != null ? String(data.yearBuilt) : f.yearBuilt,
      subdivision: data.subdivision || f.subdivision,
      appraiserUrl: data.appraiserUrl || f.appraiserUrl,
    }));
  }

  // Get auth token for Places API calls (requires Bearer header)
  async function getAuthHeaders() {
    const supabase = createSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    return { 'Authorization': `Bearer ${session.access_token}` };
  }

  // Google Places autocomplete
  async function handleAddressChange(value) {
    setForm(f => ({ ...f, address: value }));
    if (value.length < 4) { setShowAutocomplete(false); return; }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAutocompleteResults(data.predictions || []);
        setShowAutocomplete(true);
      }
    } catch { /* silent */ }
  }

  async function selectPlace(placeId, description) {
    setShowAutocomplete(false);
    setForm(f => ({ ...f, address: description }));
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(placeId)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Places details returns flat: street_number, street_name, city, state_or_province, postal_code, county, latitude, longitude
        setForm(f => ({
          ...f,
          address: [data.street_number, data.street_name].filter(Boolean).join(' ') || f.address,
          city: data.city || f.city,
          state: data.state_or_province || 'FL',
          zip: data.postal_code || f.zip,
          county: data.county || f.county,
          lat: data.latitude || null,
          lng: data.longitude || null,
        }));
      }
    } catch { /* silent */ }
  }

  async function generateReport() {
    setGenerating(true);
    setError(null);
    setView('generating');
    try {
      const res = await fetch('/api/admin/rent-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: {
            ...form,
            beds: form.beds ? parseInt(form.beds) : null,
            baths: form.baths ? parseFloat(form.baths) : null,
            sqft: form.sqft ? parseInt(form.sqft) : null,
            yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt) : null,
            hoaFee: form.hoaFee ? parseFloat(form.hoaFee) : null,
          },
          sourceWeights: { mlsWeight, webWeight: 100 - mlsWeight },
        }),
      });
      if (res.ok) {
        const report = await res.json();
        setActiveReport(report);
        setView('report');
        fetchData(); // refresh list
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to generate report');
        setView('form');
      }
    } catch (err) {
      setError(err.message);
      setView('form');
    }
    setGenerating(false);
  }

  async function viewReport(id) {
    try {
      const res = await fetch(`/api/admin/rent-range?id=${id}`);
      if (res.ok) {
        setActiveReport(await res.json());
        setView('report');
      }
    } catch { /* silent */ }
  }

  if (loading) {
    return <div style={{ color: COLORS.textDim, padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  // ============================================================
  // REPORT VIEW
  // ============================================================
  if (view === 'report' && activeReport) {
    const rr = activeReport.rent_range || {};
    const pd = activeReport.property_details || {};
    const mkt = activeReport.market_data || {};
    const trend = mkt.trend || {};
    const mlsComps = activeReport.mls_comps || [];
    const webComps = activeReport.web_comps || [];
    const sources = activeReport.sources || [];
    const meth = activeReport.methodology || {};

    return (
      <div>
        <button onClick={() => { setActiveReport(null); setView('list'); }} style={{ ...baseButton, background: COLORS.border, color: COLORS.textMuted, marginBottom: 20 }}>
          ← Back to Reports
        </button>

        {/* Subject Property */}
        <div style={{ background: COLORS.surface, borderRadius: 8, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Subject Property</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{activeReport.property_address}</div>
          <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 4 }}>
            {activeReport.city}, {activeReport.state} {activeReport.zip} · {activeReport.county}
          </div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
            {pd.propertySubType} · {pd.beds}bd/{pd.baths}ba · {pd.sqft ? `${Number(pd.sqft).toLocaleString()} sqft` : '—'} · Built {pd.yearBuilt || '—'}
            {pd.hoa && ` · HOA $${pd.hoaFee || '—'}/mo`}
            {pd.gated && ' · Gated'}
          </div>
          {pd.appraiserUrl && (
            <div style={{ marginTop: 6 }}>
              <a href={pd.appraiserUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: COLORS.brand, textDecoration: 'none' }}>
                🔗 County Appraiser Record ↗
              </a>
            </div>
          )}
        </div>

        {/* Rent Range Display */}
        <div style={{ background: COLORS.surface, borderRadius: 8, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>Estimated Rent Range</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 24 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.amber }}>${(rr.low || 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 600 }}>LOW</div>
            </div>
            <div style={{ fontSize: 14, color: COLORS.textDim }}>——</div>
            <div>
              <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.green }}>${(rr.target || 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 600 }}>TARGET</div>
            </div>
            <div style={{ fontSize: 14, color: COLORS.textDim }}>——</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.brand }}>${(rr.high || 0).toLocaleString()}</div>
              <div style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 600 }}>HIGH</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              Confidence: <strong style={{ color: rr.confidence >= 70 ? COLORS.green : rr.confidence >= 40 ? COLORS.amber : COLORS.red }}>{rr.confidence}/100</strong>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              Trend: <strong style={{ color: trend.direction === 'rising' ? COLORS.green : trend.direction === 'declining' ? COLORS.red : COLORS.textMuted }}>
                {trend.direction === 'rising' ? '↗' : trend.direction === 'declining' ? '↘' : '→'} {trend.direction || 'stable'}
                {trend.yoyPct != null && ` (${trend.yoyPct > 0 ? '+' : ''}${trend.yoyPct.toFixed(1)}% YoY)`}
              </strong>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              Sources: <strong>{rr.compCount?.mls || 0} MLS · {rr.compCount?.web || 0} web</strong>
            </div>
          </div>
          {rr.trendAdjustmentPct !== 0 && (
            <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 8 }}>
              Trend adjustment applied: {rr.trendAdjustmentPct > 0 ? '+' : ''}{rr.trendAdjustmentPct}%
            </div>
          )}
        </div>

        {/* Comparable Properties */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Comparable Properties</h3>
          <div style={{ background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '30px 50px 1fr 80px 70px 80px 36px',
              padding: '8px 16px', borderBottom: `1px solid ${COLORS.border}`,
              fontSize: 10, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase',
            }}>
              <span>#</span><span>Src</span><span>Address</span><span>Type</span><span>Dist</span><span style={{ textAlign: 'right' }}>Rent</span><span style={{ textAlign: 'right' }}>Score</span>
            </div>
            {[...mlsComps.slice(0, 10), ...webComps.slice(0, 5)].map((comp, i) => {
              const isMls = !comp._source || comp._source !== 'web';
              const rent = comp.close_price || comp.list_price || comp.rent || 0;
              const address = isMls
                ? `${comp.street_number || ''} ${comp.street_name || ''}`.trim() || comp.listing_id
                : comp.source_title || 'Web listing';
              const subType = shortType(comp.property_sub_type);
              const dist = comp._distance != null ? `${comp._distance} mi` : '—';
              const isExpanded = expandedComp === i;

              return (
                <div key={i}>
                  <div
                    onClick={() => setExpandedComp(isExpanded ? null : i)}
                    style={{
                      display: 'grid', gridTemplateColumns: '30px 50px 1fr 80px 70px 80px 36px',
                      alignItems: 'center', padding: '10px 16px', cursor: 'pointer',
                      borderBottom: `1px solid ${COLORS.border}`,
                      background: isExpanded ? COLORS.bg : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.textDim }}>#{i + 1}</span>
                    <Badge color={isMls ? 'blue' : 'purple'}>{isMls ? 'MLS' : 'Web'}</Badge>
                    <div>
                      <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{address}{isMls && comp.city ? `, ${comp.city}` : ''}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim }}>
                        {isMls ? `${comp.bedrooms || '—'}bd/${comp.bathrooms || '—'}ba · ${comp.living_area ? `${Number(comp.living_area).toLocaleString()}sf` : '—'}` : ''}
                        {!isMls && comp.source_url && (
                          <a href={comp.source_url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.brand, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>View source ↗</a>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{subType}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{dist}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.green }}>${rent.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: COLORS.textDim }}>
                        {isMls && comp.standard_status === 'Closed' ? 'Leased' : isMls ? 'Active' : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'right' }}>{comp._score || '—'}</span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && isMls && (
                    <div style={{ padding: '12px 16px', background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
                      {/* Photos */}
                      {Array.isArray(comp.photos) && comp.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          {comp.photos.slice(0, 6).map((p, pi) => (
                            <img
                              key={pi}
                              src={p.url}
                              alt={`Comp photo ${pi + 1}`}
                              style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 4, border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}
                              onClick={() => window.open(p.url, '_blank')}
                            />
                          ))}
                          {comp.photos.length > 6 && (
                            <div style={{ width: 100, height: 75, borderRadius: 4, background: COLORS.surface, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: COLORS.textDim }}>
                              +{comp.photos.length - 6} more
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 8 }}>
                        {[
                          ['MLS #', comp.listing_id || '—'],
                          ['Type', comp.property_sub_type || '—'],
                          ['Beds/Baths', `${comp.bedrooms || '—'} / ${comp.bathrooms || '—'}`],
                          ['Sqft', comp.living_area ? Number(comp.living_area).toLocaleString() : '—'],
                          ['Year Built', comp.year_built || '—'],
                          ['List Price', comp.list_price ? `$${Number(comp.list_price).toLocaleString()}` : '—'],
                          ['Close Price', comp.close_price ? `$${Number(comp.close_price).toLocaleString()}` : '—'],
                          ['DOM', comp.days_on_market != null ? `${comp.days_on_market} days` : '—'],
                          ['Close Date', comp.close_date || '—'],
                          ['Distance', dist],
                          ['Subdivision', comp.subdivision_name || '—'],
                          ['Pets', comp.pets_allowed ? 'Yes' : comp.pets_allowed === false ? 'No' : '—'],
                          ['Pool', comp.pool ? 'Yes' : '—'],
                          ['Furnished', comp.furnished ? 'Yes' : '—'],
                          ['Agent', comp.listing_agent_name || '—'],
                          ['Office', comp.listing_office_name || '—'],
                        ].map(([label, val]) => (
                          <div key={label} style={{ background: COLORS.surface, borderRadius: 4, padding: '6px 8px' }}>
                            <div style={{ fontSize: 9, color: COLORS.textDim, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                            <div style={{ fontSize: 12, color: COLORS.text, fontWeight: 500, marginTop: 1 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Market Context */}
        {(mkt.keyDrivers?.length > 0 || mkt.vacancy != null) && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Market Context</h3>
            <div style={{ background: COLORS.surface, borderRadius: 8, padding: 16, border: `1px solid ${COLORS.border}` }}>
              {mkt.vacancy != null && <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 6 }}>• Vacancy rate: {mkt.vacancy.toFixed(1)}%{mkt.vacancy < 5 ? ' (tight)' : mkt.vacancy < 8 ? ' (moderate)' : ' (soft)'}</div>}
              {(mkt.keyDrivers || []).map((d, i) => <div key={i} style={{ fontSize: 13, color: COLORS.text, marginBottom: 4 }}>• {d}</div>)}
            </div>
          </div>
        )}

        {/* Sources & Citations */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Sources & Citations</h3>
          <div style={{ background: COLORS.surface, borderRadius: 8, padding: 12, border: `1px solid ${COLORS.border}` }}>
            {sources.map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: COLORS.textMuted, padding: '4px 0' }}>
                [{i + 1}] {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.brand, textDecoration: 'none' }}>{s.title} ↗</a> : <span>{s.title}</span>}
                <Badge color={s.quality_score >= 80 ? 'green' : s.quality_score >= 50 ? 'blue' : 'gray'}>{s.type}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology (collapsible) */}
        <div style={{ marginBottom: 20 }}>
          <div onClick={() => setMethodologyOpen(!methodologyOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 0' }}>
            <span style={{ fontSize: 12, color: COLORS.textDim, transform: methodologyOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>How This Rent Range Was Calculated</h3>
          </div>
          {methodologyOpen && (
            <div style={{ background: COLORS.surface, borderRadius: 8, padding: 16, border: `1px solid ${COLORS.border}` }}>
              {/* Comp Scoring Table */}
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', marginBottom: 8 }}>Comp Scoring (per comparable)</div>
              <table style={{ width: '100%', fontSize: 12, color: COLORS.text, marginBottom: 16, borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px', color: COLORS.textDim }}>Factor</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', color: COLORS.textDim }}>Weight</th>
                </tr></thead>
                <tbody>
                  {Object.entries(meth.compWeights || defaults?.compWeights || {}).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${COLORS.border}22` }}>
                      <td style={{ padding: '4px 8px' }}>{formatWeightName(k)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{v} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Data Type Multipliers */}
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', marginBottom: 8 }}>Data Type Multipliers</div>
              <table style={{ width: '100%', fontSize: 12, color: COLORS.text, marginBottom: 16, borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px', color: COLORS.textDim }}>Data Type</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', color: COLORS.textDim }}>Multiplier</th>
                </tr></thead>
                <tbody>
                  {Object.entries(meth.dataMultipliers || defaults?.dataMultipliers || {}).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${COLORS.border}22` }}>
                      <td style={{ padding: '4px 8px' }}>{formatWeightName(k)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{v}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Source Weighting */}
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', marginBottom: 8 }}>Source Weighting</div>
              <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 4 }}>
                MLS Data: <strong>{meth.sourceWeights?.mlsWeight || 70}%</strong> · Web Data: <strong>{meth.sourceWeights?.webWeight || 30}%</strong>
              </div>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 16 }}>Default: 70% MLS / 30% Web. Auto-switches to 100% Web when no MLS comps available.</div>

              {/* Range Calculation */}
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', marginBottom: 8 }}>Range Calculation</div>
              <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.8 }}>
                <div>LOW = Weighted 25th percentile</div>
                <div>TARGET = Weighted median</div>
                <div>HIGH = Weighted 75th percentile</div>
              </div>
              {rr.trendAdjustmentPct !== 0 && (
                <div style={{ fontSize: 12, color: COLORS.amber, marginTop: 8 }}>
                  Trend adjustment: {rr.trendAdjustmentPct > 0 ? '+' : ''}{rr.trendAdjustmentPct}% ({trend.direction})
                </div>
              )}

              <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 12 }}>
                Report generated: {formatDate(activeReport.created_at)}
              </div>
            </div>
          )}
        </div>

        {/* Future: Generate Branded Report button */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button disabled style={{ ...baseButton, background: COLORS.border, color: COLORS.textDim, opacity: 0.5 }}>
            📄 Generate Branded Report (coming soon)
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // GENERATING VIEW
  // ============================================================
  if (view === 'generating') {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
        <h3 style={{ color: COLORS.text, margin: '0 0 8px' }}>Generating Rent-Range Report</h3>
        <p style={{ color: COLORS.textDim, fontSize: 14 }}>Searching MLS comps, running web research, synthesizing data...</p>
        <div style={{ marginTop: 20, width: 200, height: 4, background: COLORS.border, borderRadius: 2, margin: '20px auto', overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', background: COLORS.brand, borderRadius: 2, animation: 'rr-pulse 1.5s ease-in-out infinite' }} />
        </div>
        <style>{`@keyframes rr-pulse { 0%,100% { width: 30%; } 50% { width: 90%; } }`}</style>
      </div>
    );
  }

  // ============================================================
  // FORM VIEW
  // ============================================================
  if (view === 'form') {
    return (
      <div>
        <button onClick={() => setView('list')} style={{ ...baseButton, background: COLORS.border, color: COLORS.textMuted, marginBottom: 20 }}>← Back</button>

        {error && <div style={{ background: COLORS.redDim, color: COLORS.red, padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        {/* County Property Appraiser — FIRST: fetch data to auto-fill property details */}
        <div style={{ background: COLORS.surface, borderRadius: 8, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', marginBottom: 10 }}>County Property Appraiser</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            {Object.entries(countyAppraisers).map(([county, info]) => (
              <a key={county} href={info.url} target="_blank" rel="noopener noreferrer"
                style={{ ...baseButton, background: COLORS.brand + '22', color: COLORS.brand, border: `1px solid ${COLORS.brand}44`, textDecoration: 'none', fontSize: 12 }}>
                🔗 Open {info.name} ↗
              </a>
            ))}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 8, lineHeight: 1.5 }}>
            Open the appraiser site, find the property, then paste the URL below and click "Fetch Property Data" to auto-fill details. Or enter the street address above and fetch by address.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={form.appraiserUrl}
              onChange={e => { setForm(f => ({ ...f, appraiserUrl: e.target.value })); setScrapeResults(null); }}
              placeholder="Paste property appraiser URL here, or enter address above first"
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12, flex: 1 }}
            />
            <button
              onClick={async () => {
                setScraping(true);
                setError(null);
                setScrapeResults(null);
                try {
                  const res = await fetch('/api/admin/rent-range/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      county: form.county,
                      address: form.address,
                      appraiserUrl: form.appraiserUrl,
                    }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.multiple) {
                      setScrapeResults(data.results);
                    } else {
                      applyScrapedData(data);
                    }
                  } else {
                    const data = await res.json();
                    setError(`Appraiser fetch failed: ${data.error}`);
                  }
                } catch (err) {
                  setError(`Appraiser fetch failed: ${err.message}`);
                }
                setScraping(false);
              }}
              disabled={scraping || (!form.appraiserUrl && !form.address)}
              title="FRAGILE — Fetches data from county appraiser website. May break when site redesigns. May violate site Terms of Service. Admin assumes all risk."
              style={{
                ...baseButton,
                background: scraping ? COLORS.border : COLORS.amber + '22',
                color: scraping ? COLORS.textDim : COLORS.amber,
                border: `1px solid ${COLORS.amber}44`,
                fontSize: 12, whiteSpace: 'nowrap',
                opacity: (!form.appraiserUrl && !form.address) ? 0.4 : 1,
              }}
            >
              {scraping ? 'Fetching...' : '⚠️ Fetch Property Data'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: COLORS.red + 'aa', marginTop: 6 }}>
            ⚠️ FRAGILE — Scrapes county appraiser site. May break when site redesigns. May violate site Terms of Service. Use manual entry when possible.
          </div>

          {/* Multi-property selection (condos, multi-unit) */}
          {scrapeResults && (
            <div style={{ marginTop: 12, background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', borderBottom: `1px solid ${COLORS.border}` }}>
                Multiple Properties Found — Select One
              </div>
              {scrapeResults.map((r, i) => (
                <div key={i} onClick={async () => {
                  setScraping(true);
                  setScrapeResults(null);
                  try {
                    const res = await fetch('/api/admin/rent-range/scrape', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ county: form.county, appraiserUrl: `https://www.pamartinfl.gov/app/search/view/${r.ain}` }),
                    });
                    if (res.ok) applyScrapedData(await res.json());
                  } catch { /* silent */ }
                  setScraping(false);
                }} style={{
                  padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${COLORS.border}`,
                  display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{r.address}</div>
                    <div style={{ fontSize: 11, color: COLORS.textDim }}>{r.useClass} · {r.subdivision || 'No subdivision'}</div>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.green, fontWeight: 600 }}>${r.marketValue?.toLocaleString() || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Property Details — auto-filled by appraiser fetch, editable by admin */}
        <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 16 }}>Property Details</h3>
        <div style={{ background: COLORS.surface, borderRadius: 8, padding: 20, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
          {/* Address with autocomplete */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <label style={labelStyle}>Street Address</label>
            <input
              value={form.address}
              onChange={e => handleAddressChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              placeholder="Start typing an address..."
              style={inputStyle}
            />
            {showAutocomplete && autocompleteResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, zIndex: 10, maxHeight: 200, overflow: 'auto' }}>
                {autocompleteResults.map((r, i) => (
                  <div key={i} onClick={() => selectPlace(r.place_id, r.description)}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}>
                    {r.description}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 200px', gap: 12, marginBottom: 12 }}>
            <div><label style={labelStyle}>City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>State</label><input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>Zip</label><input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>County</label>
              <select value={form.county} onChange={e => setForm(f => ({ ...f, county: e.target.value }))} style={inputStyle}>
                <option value="Martin County">Martin County</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 100px', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Property Type</label>
              <select value={form.propertySubType} onChange={e => setForm(f => ({ ...f, propertySubType: e.target.value }))} style={inputStyle}>
                {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Beds</label><input type="number" value={form.beds} onChange={e => setForm(f => ({ ...f, beds: e.target.value }))} style={inputStyle} placeholder="3" /></div>
            <div><label style={labelStyle}>Baths</label><input type="number" step="0.5" value={form.baths} onChange={e => setForm(f => ({ ...f, baths: e.target.value }))} style={inputStyle} placeholder="2" /></div>
            <div><label style={labelStyle}>Sqft</label><input type="number" value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))} style={inputStyle} placeholder="1,450" /></div>
            <div><label style={labelStyle}>Year Built</label><input type="number" value={form.yearBuilt} onChange={e => setForm(f => ({ ...f, yearBuilt: e.target.value }))} style={inputStyle} placeholder="2005" /></div>
          </div>

          {/* Subdivision — full width row */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Subdivision / Community</label>
            <input value={form.subdivision} onChange={e => setForm(f => ({ ...f, subdivision: e.target.value }))} style={inputStyle} placeholder="Optional" />
          </div>

          {/* HOA + Gated — manual only */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.hoa} onChange={e => setForm(f => ({ ...f, hoa: e.target.checked }))} />
              <label style={{ fontSize: 12, color: COLORS.textMuted }}>HOA</label>
              <span style={{ fontSize: 10, color: COLORS.textDim, fontStyle: 'italic' }}>Optional, not scraped</span>
            </div>
            {form.hoa && <div style={{ minWidth: 100 }}><label style={labelStyle}>HOA $/mo</label><input type="number" value={form.hoaFee} onChange={e => setForm(f => ({ ...f, hoaFee: e.target.value }))} style={inputStyle} /></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.gated} onChange={e => setForm(f => ({ ...f, gated: e.target.checked }))} />
              <label style={{ fontSize: 12, color: COLORS.textMuted }}>Gated</label>
              <span style={{ fontSize: 10, color: COLORS.textDim, fontStyle: 'italic' }}>Optional, not scraped</span>
            </div>
          </div>
        </div>

        {/* MLS/Web Weight Slider */}
        <div style={{ background: COLORS.surface, borderRadius: 8, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase' }}>Source Weighting</div>
            <span style={{ fontSize: 11, color: COLORS.amber, fontWeight: 600 }}>Drag slider to adjust</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: mlsWeight >= 50 ? COLORS.brand : COLORS.textDim }}>{mlsWeight}%</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase' }}>MLS</div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ height: 8, borderRadius: 4, background: COLORS.border, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${mlsWeight}%`, background: `linear-gradient(90deg, ${COLORS.brand}, ${COLORS.purple})`, borderRadius: 4, transition: 'width 0.15s' }} />
              </div>
              <input type="range" min={0} max={100} step={5} value={mlsWeight} onChange={e => setMlsWeight(Number(e.target.value))}
                style={{ position: 'absolute', top: -4, left: 0, width: '100%', height: 16, opacity: 0, cursor: 'pointer' }} />
            </div>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: (100 - mlsWeight) >= 50 ? COLORS.purple : COLORS.textDim }}>{100 - mlsWeight}%</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase' }}>Web</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 8, textAlign: 'center' }}>
            Default: 70/30. Auto-switches to 100% Web when no MLS comps available.
          </div>
        </div>

        <button onClick={generateReport} disabled={!form.address || !form.city || generating}
          style={{ ...baseButton, background: COLORS.brand, color: '#000', fontWeight: 700, fontSize: 14, padding: '12px 24px', opacity: (!form.address || !form.city) ? 0.5 : 1 }}>
          🔍 Generate Rent-Range Report
        </button>
      </div>
    );
  }

  // ============================================================
  // LIST VIEW (default)
  // ============================================================
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Reports Generated" value={reports.length} accent={COLORS.brand} />
        {Object.entries(compStats).map(([county, stats]) => (
          <StatCard key={county} label={county} value={stats.active + stats.closed} sub={`${stats.active} active · ${stats.closed} closed`} accent={COLORS.purple} />
        ))}
        <StatCard label="Data Source" value="Bridge IDX" sub="Active + Closed rentals" accent={COLORS.green} />
      </div>

      <button onClick={() => setView('form')} style={{ ...baseButton, background: COLORS.brand, color: '#000', fontWeight: 700, marginBottom: 20 }}>
        + New Rent-Range Report
      </button>

      {/* Recent Reports */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Recent Reports</h3>
      <div style={{ background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        {reports.length === 0 ? (
          <div style={{ padding: '20px 16px', color: COLORS.textDim, textAlign: 'center', fontSize: 13 }}>No reports yet. Click "New Rent-Range Report" to get started.</div>
        ) : (
          reports.map((r, i) => {
            const rr = r.rent_range || {};
            return (
              <div key={r.id} onClick={() => viewReport(r.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
                borderBottom: i < reports.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{r.property_address}</div>
                  <div style={{ fontSize: 12, color: COLORS.textDim }}>{r.city}, {r.county}</div>
                </div>
                {rr.target > 0 && (
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.green }}>
                    ${rr.low?.toLocaleString()} — ${rr.high?.toLocaleString()}
                  </div>
                )}
                <Badge color={r.status === 'complete' ? 'green' : r.status === 'archived' ? 'gray' : 'amber'}>{r.status}</Badge>
                <span style={{ fontSize: 12, color: COLORS.textDim }}>{timeAgo(r.created_at)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function formatWeightName(key) {
  const map = {
    propertySubType: 'Same property sub-type',
    bedBathMatch: 'Bed/bath exact match',
    sqftSimilarity: 'Sqft within 10%',
    distance: 'Distance (<1 mi)',
    priceTier: 'Similar price tier',
    communityMatch: 'Same community/HOA/gated',
    freshness: 'Data freshness (<30 days)',
    actualLeased: 'Actual leased price (MLS)',
    activeAsking: 'Active asking rent (MLS)',
    expiredAsking: 'Expired asking rent (MLS)',
    webPortal: 'Web portal listing',
    marketReport: 'Market report median',
  };
  return map[key] || key;
}

function shortType(type) {
  if (!type) return '—';
  const t = type.toLowerCase();
  if (t.includes('single family')) return 'SFR';
  if (t.includes('condo') || t.includes('cooperative')) return 'Condo';
  if (t.includes('townhouse') || t.includes('townhome')) return 'TH';
  if (t.includes('duplex')) return 'Duplex';
  if (t.includes('triplex')) return 'Triplex';
  if (t.includes('quad')) return 'Quad';
  return type.slice(0, 10);
}

const labelStyle = { display: 'block', fontSize: 11, color: COLORS.textDim, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 };
const inputStyle = {
  width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
  borderRadius: 6, padding: '7px 10px', color: COLORS.text, fontSize: 13,
  fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
};
