'use client';

import { useState, useEffect, useCallback, useMemo } from "react";

// ╔══════════════════════════════════════════════════════════════════╗
// ║  PADMAGNET ADMIN DASHBOARD v1                                   ║
// ║                                                                 ║
// ║  Panels:                                                        ║
// ║    Overview  — KPIs, feed health, alerts                        ║
// ║    Feeds     — IDX feed management, sync logs, field mappings   ║
// ║    PadScore  — Weight editor with live preview                  ║
// ║    Listings  — Browse, search, suppress, quality view           ║
// ║    Support   — SMS-first ticket inbox + thread view             ║
// ║    Billing   — Subscription overview + ledger (stub)            ║
// ║                                                                 ║
// ║  WIRING: Replace DEMO_* data with Supabase queries.            ║
// ║  Each section has a "// SUPABASE:" comment showing the query.   ║
// ╚══════════════════════════════════════════════════════════════════╝

// === DEMO DATA (replace with Supabase queries) ===
const DEMO_FEEDS = [
  { id: "f1", name: "BeachesMLS", provider_type: "rets", enabled: true, coverage_counties: ["Martin", "St. Lucie"], poll_interval_min: 60, last_sync_at: "2026-02-25T14:30:00Z", last_sync_status: "success", consecutive_failures: 0 },
  { id: "f2", name: "Manual Imports", provider_type: "manual", enabled: true, coverage_counties: ["Martin"], poll_interval_min: null, last_sync_at: "2026-02-24T09:00:00Z", last_sync_status: "success", consecutive_failures: 0 },
];

const DEMO_SYNC_LOGS = [
  { id: "s1", feed_id: "f1", started_at: "2026-02-25T14:30:00Z", completed_at: "2026-02-25T14:31:12Z", status: "success", listings_added: 12, listings_updated: 47, listings_deactivated: 3, listings_skipped: 0, duration_ms: 72000 },
  { id: "s2", feed_id: "f1", started_at: "2026-02-25T13:30:00Z", completed_at: "2026-02-25T13:31:05Z", status: "success", listings_added: 4, listings_updated: 38, listings_deactivated: 1, listings_skipped: 2, duration_ms: 65000 },
  { id: "s3", feed_id: "f1", started_at: "2026-02-25T12:30:00Z", completed_at: "2026-02-25T12:30:45Z", status: "partial", listings_added: 8, listings_updated: 22, listings_deactivated: 0, listings_skipped: 5, duration_ms: 45000 },
];

const DEMO_LISTINGS = [
  { id: "p1", mls_number: "RX-10998871", address_line1: "1425 SE Coral Reef St", city: "Stuart", state: "FL", zip: "34996", property_type: "sfh", rent_amount: 2800, beds: 3, baths: 2, sqft: 1650, display_status: "active", quality_score: 88, days_on_market: 5, pet_policy: "allowed", fenced_yard: true, list_date: "2026-02-20" },
  { id: "p2", mls_number: "RX-10998455", address_line1: "800 S Ocean Blvd #402", city: "Jensen Beach", state: "FL", zip: "34957", property_type: "apartment", rent_amount: 2200, beds: 2, baths: 2, sqft: 1100, display_status: "active", quality_score: 72, days_on_market: 22, pet_policy: "not_allowed", fenced_yard: false, list_date: "2026-02-03" },
  { id: "p3", mls_number: "RX-10997102", address_line1: "3380 NW Everglades Blvd", city: "Port St. Lucie", state: "FL", zip: "34983", property_type: "duplex_plus", rent_amount: 1900, beds: 2, baths: 1.5, sqft: 950, display_status: "review", quality_score: 45, days_on_market: 68, pet_policy: "unknown", fenced_yard: false, list_date: "2025-12-19" },
  { id: "p4", mls_number: "RX-10996889", address_line1: "221 SW Palm City Rd", city: "Stuart", state: "FL", zip: "34994", property_type: "sfh", rent_amount: 3500, beds: 4, baths: 3, sqft: 2400, display_status: "active", quality_score: 95, days_on_market: 2, pet_policy: "allowed", fenced_yard: true, list_date: "2026-02-23" },
  { id: "p5", mls_number: "RX-10995500", address_line1: "777 NE Dixie Hwy", city: "Stuart", state: "FL", zip: "34994", property_type: "apartment", rent_amount: 1500, beds: 1, baths: 1, sqft: 650, display_status: "suppressed", quality_score: 28, days_on_market: 95, pet_policy: "not_allowed", fenced_yard: false, list_date: "2025-11-22", suppressed_reason: "Photos missing, stale listing" },
];

const DEMO_TICKETS = [
  { id: "t1", status: "open", priority: "high", category: "listings", origin_channel: "sms", subject: "Photos not showing on my listing", market_state: "FL", created_at: "2026-02-25T10:15:00Z", last_message_at: "2026-02-25T14:02:00Z", participant_name: "Maria G.", participant_phone: "+17725551234", participant_type: "landlord", message_count: 4 },
  { id: "t2", status: "open", priority: "normal", category: "access", origin_channel: "sms", subject: "Can't log into my account", market_state: "FL", created_at: "2026-02-25T11:30:00Z", last_message_at: "2026-02-25T13:45:00Z", participant_name: "James T.", participant_phone: "+15615559876", participant_type: "tenant", message_count: 2 },
  { id: "t3", status: "pending", priority: "normal", category: "billing", origin_channel: "web", subject: "When does my free trial end?", market_state: "FL", created_at: "2026-02-24T16:00:00Z", last_message_at: "2026-02-24T16:30:00Z", participant_name: "Sarah K.", participant_phone: "+17725553456", participant_type: "landlord", message_count: 3 },
  { id: "t4", status: "closed", priority: "low", category: "bug", origin_channel: "sms", subject: "App crashed when swiping", market_state: "FL", created_at: "2026-02-23T09:00:00Z", last_message_at: "2026-02-23T11:00:00Z", participant_name: "Carlos M.", participant_phone: "+15615557890", participant_type: "tenant", message_count: 5 },
];

const DEMO_MESSAGES = {
  t1: [
    { id: "m1", direction: "inbound", channel: "sms", body: "Hi I just listed my property on PadMagnet but the photos aren't showing up. MLS# RX-10998455", delivery_status: "delivered", created_at: "2026-02-25T10:15:00Z" },
    { id: "m2", direction: "outbound", channel: "sms", body: "Hi Maria! Thanks for reaching out. Let me check on that listing for you right now.", delivery_status: "delivered", created_at: "2026-02-25T10:18:00Z" },
    { id: "m3", direction: "outbound", channel: "sms", body: "I see the issue — the MLS photo sync had a partial failure on your listing. I've triggered a manual re-sync. Photos should appear within 15 minutes.", delivery_status: "delivered", created_at: "2026-02-25T10:25:00Z" },
    { id: "m4", direction: "inbound", channel: "sms", body: "Still no photos showing. Can you check again?", delivery_status: "delivered", created_at: "2026-02-25T14:02:00Z" },
  ],
};

const DEFAULT_PADSCORE = {
  budget_over: { enabled: true, weight: 35, label: "Over Budget", desc: "Penalty when rent exceeds tenant max" },
  property_type: { enabled: true, weight: 25, label: "Wrong Type", desc: "Wrong property type for tenant" },
  beds_short: { enabled: true, weight: 18, label: "Too Few Beds", desc: "Fewer bedrooms than minimum" },
  baths_short: { enabled: true, weight: 12, label: "Too Few Baths", desc: "Fewer bathrooms than minimum" },
  location_inside_radius: { enabled: true, weight: 14, label: "Distance (in radius)", desc: "Gentle falloff within search area" },
  location_outside_radius: { enabled: true, weight: 40, label: "Distance (outside)", desc: "Sharp cliff outside search radius" },
  pets_not_allowed: { enabled: true, weight: 50, label: "No Pets (dealbreaker)", desc: "Pet owner + no pets allowed" },
  pets_unknown: { enabled: true, weight: 10, label: "Pets Unknown", desc: "Unknown pet policy for pet owner" },
  fenced_yard_bonus: { enabled: true, weight: 8, label: "Fenced Yard Bonus", desc: "Bonus for fenced yard + pet owner", isBonus: true },
  fenced_yard_missing: { enabled: true, weight: 12, label: "No Fenced Yard", desc: "No fence for pet owner" },
  hoa_mismatch: { enabled: true, weight: 8, label: "HOA Mismatch", desc: "HOA preference doesn't match" },
  furnished_mismatch: { enabled: true, weight: 6, label: "Furnished Mismatch", desc: "Furnished preference doesn't match" },
  lease_too_short: { enabled: true, weight: 35, label: "Lease Too Short", desc: "Listing lease shorter than needed" },
  stale_listing_major: { enabled: true, weight: 5, label: "Stale (60+ days)", desc: "Soft penalty for old listings" },
  stale_listing_minor: { enabled: true, weight: 2, label: "Stale (30-60 days)", desc: "Very soft penalty" },
};

// === STYLES ===
const COLORS = {
  bg: "#0A0E17",
  surface: "#111827",
  surfaceHover: "#1a2236",
  border: "#1e293b",
  borderLight: "#334155",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  brand: "#22d3ee",      // cyan
  brandDim: "#0891b2",
  green: "#22c55e",
  greenDim: "#166534",
  amber: "#f59e0b",
  amberDim: "#92400e",
  red: "#ef4444",
  redDim: "#991b1b",
  blue: "#3b82f6",
  purple: "#a78bfa",
};

const baseButton = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "none",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
  fontFamily: "'DM Sans', sans-serif",
};

// === COMPONENTS ===
function Badge({ color = "blue", children, style }) {
  const colorMap = {
    green: { bg: "#052e16", text: "#4ade80", border: "#166534" },
    amber: { bg: "#451a03", text: "#fbbf24", border: "#92400e" },
    red: { bg: "#450a0a", text: "#f87171", border: "#991b1b" },
    blue: { bg: "#0c1e3a", text: "#60a5fa", border: "#1e40af" },
    cyan: { bg: "#042f2e", text: "#22d3ee", border: "#0e7490" },
    gray: { bg: "#1e293b", text: "#94a3b8", border: "#334155" },
    purple: { bg: "#2e1065", text: "#c4b5fd", border: "#5b21b6" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: "4px", fontSize: "11px", fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      letterSpacing: "0.03em", textTransform: "uppercase", lineHeight: "18px",
      ...style,
    }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, accent = COLORS.brand }) {
  return (
    <div style={{
      background: COLORS.surface, borderRadius: "10px", padding: "18px 20px",
      border: `1px solid ${COLORS.border}`, flex: "1 1 180px", minWidth: 160,
    }}>
      <div style={{ fontSize: "12px", color: COLORS.textDim, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: 800, color: accent, lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: COLORS.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ============================================================
// OVERVIEW PANEL
// ============================================================
function OverviewPanel() {
  const activeListings = DEMO_LISTINGS.filter(l => l.display_status === "active").length;
  const reviewListings = DEMO_LISTINGS.filter(l => l.display_status === "review").length;
  const openTickets = DEMO_TICKETS.filter(t => t.status === "open").length;
  const lastSync = DEMO_FEEDS[0]?.last_sync_at;

  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Active Listings" value={activeListings} sub={`${reviewListings} in review`} accent={COLORS.green} />
        <StatCard label="Open Tickets" value={openTickets} sub="SMS-first" accent={openTickets > 0 ? COLORS.amber : COLORS.green} />
        <StatCard label="Last IDX Sync" value={timeAgo(lastSync)} sub="BeachesMLS" accent={COLORS.brand} />
        <StatCard label="Avg PadScore" value={Math.round(DEMO_LISTINGS.filter(l=>l.quality_score).reduce((a,l)=>a+l.quality_score,0)/DEMO_LISTINGS.filter(l=>l.quality_score).length)} sub="Across active listings" accent={COLORS.purple} />
      </div>

      {/* Feed Health */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Feed Health</h3>
        {DEMO_FEEDS.map(f => (
          <div key={f.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
            background: COLORS.surface, borderRadius: "8px", border: `1px solid ${COLORS.border}`,
            marginBottom: 8,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: f.last_sync_status === "success" ? COLORS.green : f.last_sync_status === "partial" ? COLORS.amber : COLORS.red,
              boxShadow: `0 0 8px ${f.last_sync_status === "success" ? COLORS.green : COLORS.amber}44`,
            }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, color: COLORS.text }}>{f.name}</span>
              <span style={{ color: COLORS.textDim, fontSize: "12px", marginLeft: 8 }}>{f.provider_type.toUpperCase()}</span>
            </div>
            <span style={{ fontSize: "12px", color: COLORS.textMuted }}>{f.coverage_counties.join(", ")}</span>
            <span style={{ fontSize: "12px", color: COLORS.textDim }}>Last sync: {timeAgo(f.last_sync_at)}</span>
            <Badge color={f.enabled ? "green" : "gray"}>{f.enabled ? "Active" : "Paused"}</Badge>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h3 style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Recent Sync Activity</h3>
        <div style={{ background: COLORS.surface, borderRadius: "8px", border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
          {DEMO_SYNC_LOGS.map((log, i) => (
            <div key={log.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
              borderBottom: i < DEMO_SYNC_LOGS.length - 1 ? `1px solid ${COLORS.border}` : "none",
            }}>
              <Badge color={log.status === "success" ? "green" : log.status === "partial" ? "amber" : "red"}>{log.status}</Badge>
              <span style={{ fontSize: "13px", color: COLORS.text, flex: 1 }}>
                +{log.listings_added} added · {log.listings_updated} updated · -{log.listings_deactivated} removed
                {log.listings_skipped > 0 && <span style={{ color: COLORS.amber }}> · {log.listings_skipped} skipped</span>}
              </span>
              <span style={{ fontSize: "12px", color: COLORS.textDim }}>{(log.duration_ms / 1000).toFixed(1)}s</span>
              <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(log.started_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FEEDS PANEL
// ============================================================
function FeedsPanel() {
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>IDX Feeds</h3>
          <p style={{ fontSize: "13px", color: COLORS.textDim, margin: "4px 0 0" }}>Manage MLS data connections and sync schedules</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} style={{
          ...baseButton, background: COLORS.brand, color: "#000", fontWeight: 700,
        }}>
          + Add Feed
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: COLORS.surface, borderRadius: "10px", border: `1px solid ${COLORS.brand}33`,
          padding: 20, marginBottom: 20,
        }}>
          <h4 style={{ color: COLORS.brand, margin: "0 0 16px", fontSize: "15px" }}>New Feed Connection</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Feed Name", placeholder: "e.g. BeachesMLS" },
              { label: "Provider Type", placeholder: "rets / web_api / manual / csv" },
              { label: "Coverage Counties", placeholder: "Martin, St. Lucie" },
              { label: "Poll Interval (min)", placeholder: "60" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", fontSize: "11px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{f.label}</label>
                <input placeholder={f.placeholder} style={{
                  width: "100%", padding: "8px 12px", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                  borderRadius: "6px", color: COLORS.text, fontSize: "13px", outline: "none", boxSizing: "border-box",
                  fontFamily: "'DM Sans', sans-serif",
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...baseButton, background: COLORS.brand, color: "#000" }}>Save Feed</button>
            <button onClick={() => setShowAddForm(false)} style={{ ...baseButton, background: COLORS.border, color: COLORS.textMuted }}>Cancel</button>
          </div>
          <p style={{ fontSize: "11px", color: COLORS.textDim, marginTop: 10, fontStyle: "italic" }}>
            SUPABASE: INSERT INTO idx_feeds (name, provider_type, coverage_counties, poll_interval_min)
          </p>
        </div>
      )}

      {/* Feed Cards */}
      {DEMO_FEEDS.map(feed => (
        <div key={feed.id} onClick={() => setSelectedFeed(selectedFeed === feed.id ? null : feed.id)} style={{
          background: COLORS.surface, borderRadius: "10px", border: `1px solid ${selectedFeed === feed.id ? COLORS.brand + "44" : COLORS.border}`,
          padding: "16px 20px", marginBottom: 10, cursor: "pointer", transition: "border-color 0.15s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              background: feed.last_sync_status === "success" ? COLORS.green : COLORS.amber,
              boxShadow: `0 0 10px ${feed.last_sync_status === "success" ? COLORS.green : COLORS.amber}55`,
            }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, color: COLORS.text, fontSize: "15px" }}>{feed.name}</span>
              <Badge color="cyan" style={{ marginLeft: 8 }}>{feed.provider_type}</Badge>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: COLORS.textMuted }}>Last sync: {timeAgo(feed.last_sync_at)}</div>
              <div style={{ fontSize: "11px", color: COLORS.textDim }}>Every {feed.poll_interval_min || "—"}min · {feed.coverage_counties.join(", ")}</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
              <button onClick={e => { e.stopPropagation(); }} style={{ ...baseButton, background: COLORS.greenDim, color: COLORS.green, fontSize: "11px", padding: "4px 10px" }}>
                ▶ Sync Now
              </button>
              <button onClick={e => { e.stopPropagation(); }} style={{ ...baseButton, background: COLORS.border, color: COLORS.textMuted, fontSize: "11px", padding: "4px 10px" }}>
                {feed.enabled ? "Pause" : "Resume"}
              </button>
            </div>
          </div>

          {/* Expanded detail */}
          {selectedFeed === feed.id && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
              <h4 style={{ color: COLORS.textMuted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Recent Syncs</h4>
              {DEMO_SYNC_LOGS.filter(l => l.feed_id === feed.id).map(log => (
                <div key={log.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                  borderBottom: `1px solid ${COLORS.border}22`,
                  fontSize: "13px",
                }}>
                  <Badge color={log.status === "success" ? "green" : "amber"}>{log.status}</Badge>
                  <span style={{ color: COLORS.text }}>+{log.listings_added}</span>
                  <span style={{ color: COLORS.textDim }}>added</span>
                  <span style={{ color: COLORS.text }}>{log.listings_updated}</span>
                  <span style={{ color: COLORS.textDim }}>updated</span>
                  <span style={{ color: COLORS.text }}>-{log.listings_deactivated}</span>
                  <span style={{ color: COLORS.textDim }}>removed</span>
                  <span style={{ marginLeft: "auto", color: COLORS.textDim, fontSize: "12px" }}>{formatDate(log.started_at)} · {(log.duration_ms / 1000).toFixed(1)}s</span>
                </div>
              ))}
              <h4 style={{ color: COLORS.textMuted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 16, marginBottom: 10 }}>Field Mappings</h4>
              <p style={{ fontSize: "12px", color: COLORS.textDim, fontStyle: "italic" }}>
                Configure how MLS fields map to PadMagnet properties. SUPABASE: SELECT * FROM idx_field_mappings WHERE feed_id = '{feed.id}'
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 16px 1fr", gap: "6px 8px", marginTop: 8 }}>
                {[
                  ["ListPrice", "rent_amount"],
                  ["PropertyType", "property_type"],
                  ["BedroomsTotal", "beds"],
                  ["BathroomsTotalDecimal", "baths"],
                  ["LivingArea", "sqft"],
                  ["ListingContractDate", "list_date"],
                  ["PetsAllowed", "pet_policy"],
                ].map(([src, tgt]) => (
                  <>
                    <div key={src} style={{ padding: "4px 8px", background: COLORS.bg, borderRadius: 4, fontSize: "12px", color: COLORS.amber, fontFamily: "monospace" }}>{src}</div>
                    <div style={{ color: COLORS.textDim, textAlign: "center", fontSize: "12px" }}>→</div>
                    <div style={{ padding: "4px 8px", background: COLORS.bg, borderRadius: 4, fontSize: "12px", color: COLORS.brand, fontFamily: "monospace" }}>{tgt}</div>
                  </>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// PADSCORE CONFIG PANEL
// ============================================================
function PadScorePanel() {
  const [config, setConfig] = useState(DEFAULT_PADSCORE);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateWeight = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: { ...prev[key], weight: parseInt(val) || 0 } }));
    setDirty(true);
    setSaved(false);
  };

  const toggleEnabled = (key) => {
    setConfig(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = () => {
    // SUPABASE: UPDATE padscore_configs SET config = {...}, updated_at = now() WHERE is_active = true
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const totalMaxPenalty = Object.entries(config).filter(([,v]) => v.enabled && !v.isBonus).reduce((sum, [,v]) => sum + v.weight, 0);
  const totalBonus = Object.entries(config).filter(([,v]) => v.enabled && v.isBonus).reduce((sum, [,v]) => sum + v.weight, 0);

  // Group by category
  const groups = [
    { title: "Budget & Type", keys: ["budget_over", "property_type"] },
    { title: "Size", keys: ["beds_short", "baths_short"] },
    { title: "Location", keys: ["location_inside_radius", "location_outside_radius"] },
    { title: "Pets & Yard", keys: ["pets_not_allowed", "pets_unknown", "fenced_yard_bonus", "fenced_yard_missing"] },
    { title: "Lifestyle", keys: ["hoa_mismatch", "furnished_mismatch"] },
    { title: "Lease & Freshness", keys: ["lease_too_short", "stale_listing_major", "stale_listing_minor"] },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>PadScore™ Configuration</h3>
          <p style={{ fontSize: "13px", color: COLORS.textDim, margin: "4px 0 0" }}>
            Max penalty pool: <span style={{ color: COLORS.red, fontWeight: 700 }}>{totalMaxPenalty} pts</span> · 
            Bonus pool: <span style={{ color: COLORS.green, fontWeight: 700 }}>+{totalBonus} pts</span> · 
            Base score: 100
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span style={{ color: COLORS.green, fontSize: "13px", fontWeight: 600 }}>✓ Saved to Supabase</span>}
          <button onClick={handleSave} disabled={!dirty} style={{
            ...baseButton,
            background: dirty ? COLORS.brand : COLORS.border,
            color: dirty ? "#000" : COLORS.textDim,
            opacity: dirty ? 1 : 0.5,
          }}>
            {dirty ? "💾 Save Config" : "No Changes"}
          </button>
        </div>
      </div>

      {groups.map(group => (
        <div key={group.title} style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: "12px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${COLORS.border}` }}>
            {group.title}
          </h4>
          {group.keys.map(key => {
            const item = config[key];
            if (!item) return null;
            const isBonus = item.isBonus;
            const barColor = !item.enabled ? COLORS.textDim : isBonus ? COLORS.green : item.weight >= 35 ? COLORS.red : item.weight >= 15 ? COLORS.amber : COLORS.blue;
            const maxVal = isBonus ? 20 : 60;

            return (
              <div key={key} style={{
                display: "grid", gridTemplateColumns: "32px 180px 1fr 60px",
                alignItems: "center", gap: 12, padding: "8px 0",
                opacity: item.enabled ? 1 : 0.4,
              }}>
                {/* Toggle */}
                <div onClick={() => toggleEnabled(key)} style={{
                  width: 28, height: 16, borderRadius: 8,
                  background: item.enabled ? COLORS.brand : COLORS.border,
                  position: "relative", cursor: "pointer", transition: "background 0.15s",
                }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 2,
                    left: item.enabled ? 14 : 2,
                    transition: "left 0.15s",
                  }} />
                </div>

                {/* Label */}
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>{item.label}</div>
                  <div style={{ fontSize: "11px", color: COLORS.textDim }}>{item.desc}</div>
                </div>

                {/* Slider */}
                <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
                  <div style={{
                    position: "absolute", left: 0, right: 0, height: 6, borderRadius: 3,
                    background: COLORS.border,
                  }} />
                  <div style={{
                    position: "absolute", left: 0, height: 6, borderRadius: 3,
                    width: `${(item.weight / maxVal) * 100}%`,
                    background: barColor,
                    transition: "width 0.15s, background 0.15s",
                  }} />
                  <input
                    type="range" min={0} max={maxVal} value={item.weight}
                    onChange={e => updateWeight(key, e.target.value)}
                    style={{
                      position: "relative", width: "100%", height: 24,
                      background: "transparent", WebkitAppearance: "none", cursor: "pointer",
                    }}
                  />
                </div>

                {/* Value */}
                <div style={{
                  textAlign: "center", fontWeight: 800, fontSize: "16px",
                  color: barColor, fontFamily: "'DM Sans', sans-serif",
                  minWidth: 50,
                }}>
                  {isBonus ? "+" : "-"}{item.weight}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Preview */}
      <div style={{
        background: COLORS.surface, borderRadius: "10px", border: `1px solid ${COLORS.border}`,
        padding: 16, marginTop: 8,
      }}>
        <h4 style={{ color: COLORS.textMuted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Score Preview — Sample Tenant vs Listings</h4>
        <p style={{ fontSize: "12px", color: COLORS.textDim, margin: "0 0 12px" }}>
          Tenant: $2,500 max · 2+ beds · Pets (dog) · Stuart, FL · 12mo lease
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {DEMO_LISTINGS.filter(l => l.display_status === "active").map(listing => {
            // Simplified preview scoring using current weights
            let score = 100;
            if (config.budget_over.enabled && listing.rent_amount > 2500) {
              score -= Math.min(config.budget_over.weight, Math.round(config.budget_over.weight * ((listing.rent_amount - 2500) / 2500)));
            }
            if (config.beds_short.enabled && listing.beds < 2) score -= config.beds_short.weight;
            if (config.pets_not_allowed.enabled && listing.pet_policy === "not_allowed") score -= config.pets_not_allowed.weight;
            if (config.pets_unknown.enabled && listing.pet_policy === "unknown") score -= config.pets_unknown.weight;
            if (config.fenced_yard_bonus.enabled && listing.fenced_yard && listing.pet_policy === "allowed") score += config.fenced_yard_bonus.weight;
            if (config.fenced_yard_missing.enabled && !listing.fenced_yard && listing.pet_policy !== "not_allowed") score -= Math.round(config.fenced_yard_missing.weight * 0.5);
            if (config.stale_listing_major.enabled && listing.days_on_market > 60) score -= config.stale_listing_major.weight;
            else if (config.stale_listing_minor.enabled && listing.days_on_market > 30) score -= config.stale_listing_minor.weight;
            score = Math.max(0, Math.min(108, score));
            const color = score >= 80 ? COLORS.green : score >= 60 ? COLORS.amber : COLORS.textDim;

            return (
              <div key={listing.id} style={{
                background: COLORS.bg, borderRadius: "8px", padding: "10px 14px",
                border: `1px solid ${COLORS.border}`, minWidth: 180, flex: "1 1 180px",
              }}>
                <div style={{ fontSize: "20px", fontWeight: 800, color, fontFamily: "'DM Sans', sans-serif" }}>{score}%</div>
                <div style={{ fontSize: "12px", color: COLORS.text, fontWeight: 600, marginTop: 2 }}>{listing.address_line1}</div>
                <div style={{ fontSize: "11px", color: COLORS.textDim }}>${listing.rent_amount}/mo · {listing.beds}bd · {listing.pet_policy}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LISTINGS PANEL
// ============================================================
function ListingsPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedListing, setSelectedListing] = useState(null);

  const filtered = DEMO_LISTINGS.filter(l => {
    if (statusFilter !== "all" && l.display_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.mls_number?.toLowerCase().includes(q) || l.address_line1?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q));
    }
    return true;
  });

  const statusColors = { active: "green", review: "amber", suppressed: "red", inactive: "gray" };
  const typeLabels = { sfh: "Single Family", apartment: "Apartment", duplex_plus: "Duplex+" };

  return (
    <div>
      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search MLS#, address, city…"
          style={{
            flex: "1 1 240px", padding: "8px 14px", background: COLORS.surface,
            border: `1px solid ${COLORS.border}`, borderRadius: "6px",
            color: COLORS.text, fontSize: "13px", outline: "none",
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        {["all", "active", "review", "suppressed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            ...baseButton,
            background: statusFilter === s ? COLORS.brand + "22" : COLORS.surface,
            color: statusFilter === s ? COLORS.brand : COLORS.textMuted,
            border: `1px solid ${statusFilter === s ? COLORS.brand + "44" : COLORS.border}`,
          }}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>
              {s === "all" ? DEMO_LISTINGS.length : DEMO_LISTINGS.filter(l => l.display_status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Listing Table */}
      <div style={{ background: COLORS.surface, borderRadius: "10px", border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "110px 1fr 90px 70px 60px 80px 80px 90px",
          gap: 8, padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`,
          fontSize: "11px", fontWeight: 700, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          <span>MLS#</span><span>Address</span><span>Type</span><span>Rent</span><span>Beds</span><span>Score</span><span>DOM</span><span>Status</span>
        </div>

        {/* Rows */}
        {filtered.map(listing => (
          <div key={listing.id} onClick={() => setSelectedListing(selectedListing === listing.id ? null : listing.id)} style={{
            display: "grid", gridTemplateColumns: "110px 1fr 90px 70px 60px 80px 80px 90px",
            gap: 8, padding: "10px 16px",
            borderBottom: `1px solid ${COLORS.border}22`,
            cursor: "pointer",
            background: selectedListing === listing.id ? COLORS.surfaceHover : "transparent",
            transition: "background 0.1s",
          }}>
            <span style={{ fontSize: "12px", color: COLORS.brand, fontFamily: "monospace", fontWeight: 600 }}>{listing.mls_number}</span>
            <div>
              <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600 }}>{listing.address_line1}</div>
              <div style={{ fontSize: "11px", color: COLORS.textDim }}>{listing.city}, {listing.state} {listing.zip}</div>
            </div>
            <span style={{ fontSize: "12px", color: COLORS.textMuted }}>{typeLabels[listing.property_type]}</span>
            <span style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600 }}>${listing.rent_amount?.toLocaleString()}</span>
            <span style={{ fontSize: "13px", color: COLORS.text }}>{listing.beds}/{listing.baths}</span>
            <span style={{
              fontSize: "14px", fontWeight: 800,
              color: listing.quality_score >= 80 ? COLORS.green : listing.quality_score >= 60 ? COLORS.amber : COLORS.textDim,
            }}>{listing.quality_score}%</span>
            <span style={{
              fontSize: "12px",
              color: listing.days_on_market <= 7 ? COLORS.green : listing.days_on_market <= 30 ? COLORS.text : listing.days_on_market <= 60 ? COLORS.amber : COLORS.red,
            }}>
              {listing.days_on_market <= 7 ? "🔥 " : ""}{listing.days_on_market}d
            </span>
            <Badge color={statusColors[listing.display_status]}>{listing.display_status}</Badge>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.textDim }}>No listings match your filters</div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedListing && (() => {
        const listing = DEMO_LISTINGS.find(l => l.id === selectedListing);
        if (!listing) return null;
        return (
          <div style={{
            background: COLORS.surface, borderRadius: "10px", border: `1px solid ${COLORS.border}`,
            padding: 20, marginTop: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
              <div>
                <h3 style={{ color: COLORS.text, margin: 0, fontSize: "16px" }}>{listing.address_line1}</h3>
                <p style={{ color: COLORS.textDim, margin: "4px 0", fontSize: "13px" }}>{listing.city}, {listing.state} {listing.zip} · MLS# {listing.mls_number}</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {listing.display_status === "active" && (
                  <button style={{ ...baseButton, background: COLORS.redDim, color: COLORS.red, fontSize: "12px" }}>Suppress</button>
                )}
                {listing.display_status === "suppressed" && (
                  <button style={{ ...baseButton, background: COLORS.greenDim, color: COLORS.green, fontSize: "12px" }}>Unsuppress</button>
                )}
                {listing.display_status === "review" && (
                  <>
                    <button style={{ ...baseButton, background: COLORS.greenDim, color: COLORS.green, fontSize: "12px" }}>Approve</button>
                    <button style={{ ...baseButton, background: COLORS.redDim, color: COLORS.red, fontSize: "12px" }}>Suppress</button>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {[
                ["Rent", `$${listing.rent_amount?.toLocaleString()}/mo`],
                ["Type", typeLabels[listing.property_type]],
                ["Beds/Baths", `${listing.beds} / ${listing.baths}`],
                ["Sqft", listing.sqft?.toLocaleString()],
                ["Pets", listing.pet_policy],
                ["Fenced Yard", listing.fenced_yard ? "Yes" : "No"],
                ["List Date", listing.list_date],
                ["DOM", `${listing.days_on_market} days`],
                ["Quality Score", `${listing.quality_score}%`],
              ].map(([label, val]) => (
                <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "8px 12px" }}>
                  <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600, marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
            {listing.suppressed_reason && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: COLORS.redDim + "44", borderRadius: 6, border: `1px solid ${COLORS.red}22` }}>
                <span style={{ fontSize: "12px", color: COLORS.red, fontWeight: 600 }}>Suppression reason: </span>
                <span style={{ fontSize: "12px", color: COLORS.text }}>{listing.suppressed_reason}</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ============================================================
// SUPPORT PANEL
// ============================================================
function SupportPanel() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [replyText, setReplyText] = useState("");

  const filtered = DEMO_TICKETS.filter(t => statusFilter === "all" || t.status === statusFilter);
  const priorityColors = { low: "gray", normal: "blue", high: "amber", urgent: "red" };
  const channelIcons = { sms: "📱", web: "🌐", email: "📧", system: "⚙️" };

  return (
    <div style={{ display: "flex", gap: 16, minHeight: 500 }}>
      {/* Ticket List */}
      <div style={{ flex: "0 0 380px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["open", "pending", "closed", "all"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setSelectedTicket(null); }} style={{
              ...baseButton, fontSize: "11px", padding: "4px 10px",
              background: statusFilter === s ? COLORS.brand + "22" : "transparent",
              color: statusFilter === s ? COLORS.brand : COLORS.textDim,
              border: `1px solid ${statusFilter === s ? COLORS.brand + "44" : "transparent"}`,
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span style={{ marginLeft: 4, opacity: 0.6 }}>
                {DEMO_TICKETS.filter(t => s === "all" || t.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {filtered.map(ticket => (
          <div key={ticket.id} onClick={() => setSelectedTicket(ticket.id)} style={{
            padding: "12px 14px", borderRadius: "8px", marginBottom: 6, cursor: "pointer",
            background: selectedTicket === ticket.id ? COLORS.surfaceHover : COLORS.surface,
            border: `1px solid ${selectedTicket === ticket.id ? COLORS.brand + "33" : COLORS.border}`,
            transition: "all 0.1s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: "14px" }}>{channelIcons[ticket.origin_channel]}</span>
              <Badge color={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
              <Badge color="gray">{ticket.category}</Badge>
              <span style={{ marginLeft: "auto", fontSize: "11px", color: COLORS.textDim }}>{timeAgo(ticket.last_message_at)}</span>
            </div>
            <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600, marginBottom: 2 }}>{ticket.subject}</div>
            <div style={{ fontSize: "12px", color: COLORS.textDim }}>
              {ticket.participant_name} · {ticket.participant_type} · {ticket.message_count} messages
            </div>
          </div>
        ))}
      </div>

      {/* Thread View */}
      <div style={{ flex: 1, background: COLORS.surface, borderRadius: "10px", border: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column" }}>
        {!selectedTicket ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textDim }}>
            Select a ticket to view the conversation
          </div>
        ) : (() => {
          const ticket = DEMO_TICKETS.find(t => t.id === selectedTicket);
          const messages = DEMO_MESSAGES[selectedTicket] || [];
          return (
            <>
              {/* Thread Header */}
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", color: COLORS.text }}>{ticket.subject}</h3>
                    <div style={{ fontSize: "12px", color: COLORS.textDim, marginTop: 2 }}>
                      {ticket.participant_name} · {ticket.participant_phone} · {ticket.origin_channel.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select style={{
                      padding: "4px 8px", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                      borderRadius: 4, color: COLORS.text, fontSize: "12px", fontFamily: "'DM Sans', sans-serif",
                    }}>
                      <option>Open</option><option>Pending</option><option>Closed</option>
                    </select>
                    <select style={{
                      padding: "4px 8px", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                      borderRadius: 4, color: COLORS.text, fontSize: "12px", fontFamily: "'DM Sans', sans-serif",
                    }}>
                      <option>Normal</option><option>High</option><option>Urgent</option><option>Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{
                    display: "flex",
                    justifyContent: msg.direction === "outbound" ? "flex-end" : "flex-start",
                    marginBottom: 12,
                  }}>
                    <div style={{
                      maxWidth: "75%", padding: "10px 14px", borderRadius: "12px",
                      background: msg.direction === "outbound" ? COLORS.brand + "22" : COLORS.bg,
                      border: `1px solid ${msg.direction === "outbound" ? COLORS.brand + "33" : COLORS.border}`,
                    }}>
                      <div style={{ fontSize: "13px", color: COLORS.text, lineHeight: 1.5 }}>{msg.body}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "10px", color: COLORS.textDim }}>{msg.channel.toUpperCase()}</span>
                        <span style={{ fontSize: "10px", color: COLORS.textDim }}>{formatDate(msg.created_at)}</span>
                        {msg.direction === "outbound" && (
                          <span style={{ fontSize: "10px", color: msg.delivery_status === "delivered" ? COLORS.green : COLORS.amber }}>
                            {msg.delivery_status === "delivered" ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div style={{ padding: "12px 18px", borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "0 8px",
                    background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}`,
                    fontSize: "12px", color: COLORS.brand,
                  }}>
                    📱 SMS
                  </div>
                  <input
                    value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply…"
                    onKeyDown={e => { if (e.key === "Enter" && replyText.trim()) { setReplyText(""); } }}
                    style={{
                      flex: 1, padding: "8px 14px", background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`, borderRadius: "6px",
                      color: COLORS.text, fontSize: "13px", outline: "none",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  <button onClick={() => setReplyText("")} style={{
                    ...baseButton, background: COLORS.brand, color: "#000", fontWeight: 700,
                  }}>
                    Send
                  </button>
                </div>
                {replyText.length > 0 && (
                  <div style={{ fontSize: "11px", color: replyText.length > 160 ? COLORS.amber : COLORS.textDim, marginTop: 4 }}>
                    {replyText.length}/160 chars {replyText.length > 160 && `(${Math.ceil(replyText.length / 160)} SMS segments)`}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ============================================================
// WAITLIST PANEL
// ============================================================
function WaitlistPanel() {
  // SUPABASE: SELECT * FROM waitlist ORDER BY created_at DESC
  const [entries] = useState([
    { id: 1, email: "maria.gonzalez@gmail.com", role: "landlord", created_at: "2026-02-25T14:30:00Z" },
    { id: 2, email: "james.t.wilson@yahoo.com", role: "tenant", created_at: "2026-02-25T13:15:00Z" },
    { id: 3, email: "sarah.k@outlook.com", role: "landlord", created_at: "2026-02-25T11:00:00Z" },
    { id: 4, email: "carlos.m.psl@gmail.com", role: "tenant", created_at: "2026-02-24T16:45:00Z" },
    { id: 5, email: "jenny.chen88@gmail.com", role: "tenant", created_at: "2026-02-24T10:20:00Z" },
    { id: 6, email: "bobsmith_rentals@gmail.com", role: "landlord", created_at: "2026-02-24T14:00:00Z" },
    { id: 7, email: "anika.patel@live.com", role: "tenant", created_at: "2026-02-23T09:30:00Z" },
    { id: 8, email: "martin.realty.group@gmail.com", role: "landlord", created_at: "2026-02-22T15:10:00Z" },
  ]);
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = entries.filter(e => roleFilter === "all" || e.role === roleFilter);
  const tenantCount = entries.filter(e => e.role === "tenant").length;
  const landlordCount = entries.filter(e => e.role === "landlord").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Signups" value={entries.length} sub="Since launch" accent={COLORS.brand} />
        <StatCard label="Tenants" value={tenantCount} sub={`${Math.round(tenantCount / entries.length * 100)}% of signups`} accent={COLORS.green} />
        <StatCard label="Landlords" value={landlordCount} sub={`${Math.round(landlordCount / entries.length * 100)}% of signups`} accent={COLORS.purple} />
        <StatCard label="Last Signup" value={timeAgo(entries[0]?.created_at)} sub={entries[0]?.email?.split("@")[0] + "…"} accent={COLORS.amber} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {["all", "tenant", "landlord"].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{
            ...baseButton,
            background: roleFilter === r ? COLORS.brand + "22" : COLORS.surface,
            color: roleFilter === r ? COLORS.brand : COLORS.textMuted,
            border: `1px solid ${roleFilter === r ? COLORS.brand + "44" : COLORS.border}`,
          }}>
            {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}
            <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>
              {r === "all" ? entries.length : entries.filter(e => e.role === r).length}
            </span>
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>
            📋 Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: COLORS.surface, borderRadius: "10px", border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 100px 180px",
          gap: 8, padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`,
          fontSize: "11px", fontWeight: 700, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          <span>Email</span><span>Role</span><span>Signed Up</span>
        </div>
        {filtered.map((entry, i) => (
          <div key={entry.id} style={{
            display: "grid", gridTemplateColumns: "1fr 100px 180px",
            gap: 8, padding: "12px 16px",
            borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.border}22` : "none",
          }}>
            <span style={{ fontSize: "13px", color: COLORS.text, fontWeight: 500 }}>{entry.email}</span>
            <Badge color={entry.role === "landlord" ? "purple" : "cyan"}>{entry.role}</Badge>
            <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(entry.created_at)}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: "12px", color: COLORS.textDim, marginTop: 12, fontStyle: "italic" }}>
        Wire to Supabase: SELECT * FROM waitlist ORDER BY created_at DESC
      </p>
    </div>
  );
}

// ============================================================
// BILLING PANEL (stub — schema ready, wires to Stripe later)
// ============================================================
function BillingPanel() {
  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="MRR" value="$0" sub="No subscribers yet" accent={COLORS.textDim} />
        <StatCard label="Active Subscriptions" value="0" sub="Stripe not connected" accent={COLORS.textDim} />
        <StatCard label="Pending Ledger Entries" value="0" sub="QuickBooks sync ready" accent={COLORS.textDim} />
      </div>

      <div style={{
        background: COLORS.surface, borderRadius: "10px", border: `1px dashed ${COLORS.border}`,
        padding: 40, textAlign: "center",
      }}>
        <div style={{ fontSize: "40px", marginBottom: 12 }}>💳</div>
        <h3 style={{ color: COLORS.text, margin: "0 0 8px" }}>Billing System Ready</h3>
        <p style={{ color: COLORS.textDim, fontSize: "14px", maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.6 }}>
          The database tables for subscriptions, invoices, payments, and ledger entries are deployed. 
          Connect Stripe to activate billing, then ledger entries will auto-sync to QuickBooks.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button style={{ ...baseButton, background: COLORS.purple + "33", color: COLORS.purple, border: `1px solid ${COLORS.purple}44` }}>
            Connect Stripe
          </button>
          <button style={{ ...baseButton, background: COLORS.border, color: COLORS.textMuted }}>
            Connect QuickBooks
          </button>
        </div>

        <div style={{ marginTop: 28, textAlign: "left", maxWidth: 500, margin: "28px auto 0" }}>
          <h4 style={{ color: COLORS.textMuted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Schema Deployed</h4>
          {["subscriptions — plan, status, Stripe IDs, billing periods",
            "invoices — line items, amounts, payment status",
            "payments — Stripe payment intents, method, failure tracking",
            "ledger_entries — QuickBooks bridge (revenue/refund/fee/payout)",
          ].map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
              fontSize: "13px", color: COLORS.textDim,
            }}>
              <span style={{ color: COLORS.green }}>✓</span> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "waitlist", label: "Waitlist", icon: "📧" },
  { id: "feeds", label: "IDX Feeds", icon: "🔌" },
  { id: "padscore", label: "PadScore", icon: "🎯" },
  { id: "listings", label: "Listings", icon: "🏠" },
  { id: "support", label: "Support", icon: "💬" },
  { id: "billing", label: "Billing", icon: "💳" },
];

export default function PadMagnetAdmin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const panels = {
    overview: <OverviewPanel />,
    waitlist: <WaitlistPanel />,
    feeds: <FeedsPanel />,
    padscore: <PadScorePanel />,
    listings: <ListingsPanel />,
    support: <SupportPanel />,
    billing: <BillingPanel />,
  };

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: COLORS.bg, color: COLORS.text,
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? 60 : 220,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex", flexDirection: "column",
        transition: "width 0.2s ease",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarCollapsed ? "18px 10px" : "18px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
        }} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <div style={{
            width: 32, height: 32, borderRadius: "8px",
            background: `linear-gradient(135deg, ${COLORS.brand}, ${COLORS.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", fontWeight: 900, color: "#000",
            flexShrink: 0,
          }}>
            P
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: COLORS.text, letterSpacing: "-0.02em" }}>PadMagnet</div>
              <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <div style={{ padding: "12px 8px", flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            const isSupport = item.id === "support";
            const openCount = DEMO_TICKETS.filter(t => t.status === "open").length;
            return (
              <div key={item.id} onClick={() => setActiveTab(item.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: sidebarCollapsed ? "10px 0" : "10px 12px",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                borderRadius: "6px", cursor: "pointer",
                background: isActive ? COLORS.brand + "15" : "transparent",
                color: isActive ? COLORS.brand : COLORS.textMuted,
                fontWeight: isActive ? 700 : 500,
                fontSize: "14px",
                marginBottom: 2,
                transition: "all 0.1s",
                position: "relative",
              }}>
                <span style={{ fontSize: "16px", width: 24, textAlign: "center" }}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
                {isSupport && openCount > 0 && (
                  <span style={{
                    position: sidebarCollapsed ? "absolute" : "relative",
                    top: sidebarCollapsed ? 4 : "auto",
                    right: sidebarCollapsed ? 4 : "auto",
                    marginLeft: sidebarCollapsed ? 0 : "auto",
                    background: COLORS.red, color: "#fff",
                    fontSize: "10px", fontWeight: 800,
                    width: 18, height: 18, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {openCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${COLORS.border}`, fontSize: "11px", color: COLORS.textDim }}>
            <div>Supabase: <span style={{ color: COLORS.green }}>●</span> Connected</div>
            <div style={{ marginTop: 2 }}>v1.0 · Feb 2026</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Top Bar */}
        <div style={{
          padding: "14px 28px",
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h1 style={{
            margin: 0, fontSize: "20px", fontWeight: 800,
            color: COLORS.text, letterSpacing: "-0.02em",
          }}>
            {NAV_ITEMS.find(n => n.id === activeTab)?.icon} {NAV_ITEMS.find(n => n.id === activeTab)?.label}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Badge color="cyan">Martin + St. Lucie County</Badge>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.brand}, ${COLORS.purple})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 800, color: "#000",
            }}>
              A
            </div>
          </div>
        </div>

        {/* Panel Content */}
        <div style={{ padding: "24px 28px" }}>
          {panels[activeTab]}
        </div>
      </div>
    </div>
  );
}
