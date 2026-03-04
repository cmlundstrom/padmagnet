'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "../../lib/supabase-browser";
import AdminTable from "./components/AdminTable";
import AddEntryForm from "./components/AddEntryForm";
import ConfirmDialog from "./components/ConfirmDialog";
import AuditHistory from "./components/AuditHistory";
import exportCSV from "./components/CSVExport";
import { BACKLOG } from "./backlog-data";

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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

function formatDateFull(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

// ============================================================
// OVERVIEW PANEL
// ============================================================
function OverviewPanel({ openTicketCount = 0 }) {
  const activeListings = DEMO_LISTINGS.filter(l => l.display_status === "active").length;
  const reviewListings = DEMO_LISTINGS.filter(l => l.display_status === "review").length;
  const openTickets = openTicketCount;
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
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listings");
      if (!res.ok) throw new Error("Failed to load listings");
      const data = await res.json();
      setListings(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const TYPE_ABBREV = { "Single Family Residence": "SFR", "Condominium": "Condo", "Townhouse": "TH", "Duplex": "Duplex", "Apartment": "Apt", "Mobile Home": "MH" };

  const STATUS_FILTERS = ["all", "active", "draft", "expired", "leased", "archived", "suppressed"];

  const enriched = useMemo(() => {
    return listings.map(l => {
      const dom = l.created_at ? Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000) : 0;
      return {
        ...l,
        address: [l.street_number, l.street_name].filter(Boolean).join(" ") || "—",
        address_city: [l.city, l.state_or_province, l.postal_code].filter(Boolean).join(", "),
        days_on_market: dom,
        beds_baths: `${l.bedrooms_total ?? "—"}/${l.bathrooms_total ?? "—"}`,
        suppressed: !l.is_active,
      };
    });
  }, [listings]);

  const filtered = useMemo(() => {
    return enriched.filter(l => {
      if (statusFilter === "suppressed") {
        if (l.is_active) return false;
      } else if (statusFilter !== "all") {
        if (l.status !== statusFilter) return false;
        if (!l.is_active) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          l.listing_id?.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, statusFilter, search]);

  // Stat counts
  const totalCount = listings.length;
  const mlsCount = listings.filter(l => l.source === "mls" || l.source === "bridge").length;
  const ownerCount = listings.filter(l => l.source === "owner").length;
  const activeCount = listings.filter(l => l.status === "active" && l.is_active).length;
  const draftCount = listings.filter(l => l.status === "draft").length;
  const suppressedCount = listings.filter(l => !l.is_active).length;

  const statusCountFor = (s) => {
    if (s === "all") return enriched.length;
    if (s === "suppressed") return suppressedCount;
    return enriched.filter(l => l.status === s && l.is_active).length;
  };

  // CRUD handlers
  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchListings();
  }, [fetchListings]);

  const handleBulkDelete = useCallback((ids) => {
    setConfirmAction({
      type: "delete",
      ids,
      message: `Archive ${ids.length} listing${ids.length > 1 ? "s" : ""}? They will be set to inactive/archived.`,
    });
  }, []);

  const handleBulkSuppress = useCallback((ids) => {
    setConfirmAction({
      type: "suppress",
      ids,
      message: `Suppress ${ids.length} listing${ids.length > 1 ? "s" : ""}? They will be hidden from tenants.`,
    });
  }, []);

  const handleBulkUnsuppress = useCallback((ids) => {
    handleSave(ids, { is_active: true, status: "active" });
  }, [handleSave]);

  const confirmExecute = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") {
      await fetch("/api/admin/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmAction.ids }),
      });
    } else if (confirmAction.type === "suppress") {
      await handleSave(confirmAction.ids, { is_active: false });
    }
    setConfirmAction(null);
    fetchListings();
  }, [confirmAction, handleSave, fetchListings]);

  // Column defs
  const columns = useMemo(() => [
    {
      accessorKey: "listing_id",
      header: "MLS#",
      cell: ({ getValue }) => (
        <span style={{ fontFamily: "monospace", color: COLORS.brand, fontWeight: 600, fontSize: "12px" }}>
          {getValue() || "—"}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div>
          <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600 }}>{row.original.address}</div>
          <div style={{ fontSize: "11px", color: COLORS.textDim }}>{row.original.address_city}</div>
        </div>
      ),
    },
    {
      accessorKey: "property_sub_type",
      header: "Type",
      cell: ({ getValue }) => {
        const v = getValue();
        return <span style={{ fontSize: "12px", color: COLORS.textMuted }}>{TYPE_ABBREV[v] || v || "—"}</span>;
      },
      size: 80,
    },
    {
      accessorKey: "list_price",
      header: "Rent",
      cell: ({ getValue }) => {
        const v = getValue();
        return <span style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600 }}>{v ? `$${Number(v).toLocaleString()}` : "—"}</span>;
      },
      size: 90,
    },
    {
      accessorKey: "beds_baths",
      header: "Bd/Ba",
      cell: ({ getValue }) => <span style={{ fontSize: "13px" }}>{getValue()}</span>,
      size: 70,
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ getValue }) => {
        const v = getValue();
        const isMLS = v === "mls" || v === "bridge";
        return <Badge color={isMLS ? "blue" : "purple"}>{isMLS ? "MLS" : "OWNER"}</Badge>;
      },
      size: 80,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue();
        const statusColors = { active: "green", draft: "amber", expired: "red", leased: "blue", archived: "gray" };
        return <Badge color={statusColors[v] || "gray"}>{v}</Badge>;
      },
      size: 90,
      meta: {
        editable: true,
        editOptions: [
          { value: "active", label: "Active" },
          { value: "draft", label: "Draft" },
          { value: "expired", label: "Expired" },
          { value: "leased", label: "Leased" },
          { value: "archived", label: "Archived" },
        ],
      },
    },
    {
      accessorKey: "days_on_market",
      header: "DOM",
      cell: ({ getValue }) => {
        const dom = getValue();
        const color = dom <= 7 ? COLORS.green : dom <= 30 ? COLORS.text : dom <= 60 ? COLORS.amber : COLORS.red;
        return <span style={{ fontSize: "12px", color }}>{dom}d</span>;
      },
      size: 70,
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 150,
    },
  ], []);

  // Expanded row
  const renderExpandedRow = useCallback((row) => {
    const handleSuppress = () => handleSave([row.id], { is_active: false });
    const handleUnsuppress = () => handleSave([row.id], { is_active: true, status: "active" });
    const handleApprove = () => handleSave([row.id], { status: "active", is_active: true });
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            ["Rent", row.list_price ? `$${Number(row.list_price).toLocaleString()}/mo` : "—"],
            ["Type", row.property_sub_type || row.property_type || "—"],
            ["Beds/Baths", `${row.bedrooms_total ?? "—"} / ${row.bathrooms_total ?? "—"}`],
            ["Sqft", row.living_area ? Number(row.living_area).toLocaleString() : "—"],
            ["Pets", row.pets_allowed || "—"],
            ["Fenced Yard", row.fenced_yard ? "Yes" : "No"],
            ["Source", row.source || "—"],
            ["DOM", `${row.days_on_market} days`],
            ["Views", row.view_count ?? 0],
            ["Inquiries", row.inquiry_count ?? 0],
            ["Photos", Array.isArray(row.photos) ? row.photos.length : 0],
            ["Boosted", row.is_boosted ? "Yes" : "No"],
          ].map(([label, val]) => (
            <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 600, marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {row.is_active && (
            <button onClick={handleSuppress} style={{ ...baseButton, background: COLORS.redDim, color: COLORS.red, fontSize: "12px" }}>Suppress</button>
          )}
          {!row.is_active && (
            <button onClick={handleUnsuppress} style={{ ...baseButton, background: COLORS.greenDim, color: COLORS.green, fontSize: "12px" }}>Unsuppress</button>
          )}
          {row.status === "draft" && (
            <button onClick={handleApprove} style={{ ...baseButton, background: COLORS.greenDim, color: COLORS.green, fontSize: "12px" }}>Approve</button>
          )}
        </div>
        <AuditHistory tableName="listings" rowId={row.id} />
      </div>
    );
  }, [handleSave]);

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Listings" value={totalCount} sub={`${mlsCount} MLS / ${ownerCount} owner`} accent={COLORS.brand} />
        <StatCard label="Active" value={activeCount} sub={totalCount > 0 ? `${Math.round(activeCount / totalCount * 100)}% of total` : "—"} accent={COLORS.green} />
        <StatCard label="Drafts" value={draftCount} sub="Pending review" accent={COLORS.amber} />
        <StatCard label="Suppressed" value={suppressedCount} sub="Hidden from tenants" accent={COLORS.red} />
      </div>

      {/* Search & Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search MLS#, address, city…"
          className="audit-panel-input"
          style={{ flex: "1 1 240px" }}
        />
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            ...baseButton,
            background: statusFilter === s ? COLORS.brand + "22" : COLORS.surface,
            color: statusFilter === s ? COLORS.brand : COLORS.textMuted,
            border: `1px solid ${statusFilter === s ? COLORS.brand + "44" : COLORS.border}`,
          }}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>{statusCountFor(s)}</span>
          </button>
        ))}
      </div>

      <AdminTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        tableName="listings"
        storageKey="listings"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        onBulkSuppress={handleBulkSuppress}
        onBulkUnsuppress={handleBulkUnsuppress}
        emptyMessage="No listings match your filters"
        renderExpandedRow={renderExpandedRow}
      />

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={confirmExecute}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// SUPPORT PANEL (CRUD-enabled with AdminTable)
// ============================================================
function SupportPanel({ onTicketChange }) {
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyChannel, setReplyChannel] = useState("web");
  const [replySending, setReplySending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // Fetch admin user profile from profiles table
  useEffect(() => {
    const fetchAdmin = async () => {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const res = await fetch(`/api/admin/users?id=${user.id}`);
          if (res.ok) {
            const profile = await res.json();
            setAdminUser({
              email: profile.email || user.email,
              display_name: profile.display_name || user.email?.split("@")[0] || "Admin",
              phone: profile.phone || "",
            });
          } else {
            // Fallback to auth user if profile not found
            setAdminUser({
              email: user.email,
              display_name: user.email?.split("@")[0] || "Admin",
              phone: "",
            });
          }
        } catch {
          setAdminUser({
            email: user.email,
            display_name: user.email?.split("@")[0] || "Admin",
            phone: "",
          });
        }
      }
    };
    fetchAdmin();
  }, []);

  const channelIcons = { sms: "📱", web: "🌐", email: "📧", phone: "📞" };
  const priorityColors = { low: "gray", normal: "blue", high: "amber", urgent: "red" };
  const statusColors = { open: "green", in_progress: "cyan", resolved: "blue", closed: "gray" };
  const categoryColors = { general: "gray", listings: "blue", access: "cyan", billing: "purple", bug: "red", privacy: "amber", unsubscribe: "amber" };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tickets");
      if (!res.ok) throw new Error("Failed to load tickets");
      const data = await res.json();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
    onTicketChange?.();
  }, [onTicketChange]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const fetchMessages = useCallback(async (ticketId) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/messages?ticket_id=${ticketId}`);
      if (res.ok) setMessages(await res.json());
    } catch {
      // silent
    }
    setMessagesLoading(false);
  }, []);

  // When a ticket is selected, load its messages
  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket);
      setReplyText("");
    } else {
      setMessages([]);
    }
  }, [selectedTicket, fetchMessages]);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tickets, statusFilter]);

  const openCount = tickets.filter(t => t.status === "open").length;
  const inProgressCount = tickets.filter(t => t.status === "in_progress").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;
  const smsCount = tickets.filter(t => t.channel === "sms").length;

  // CRUD handlers
  const handleAddTicket = useCallback(async (values) => {
    const res = await fetch("/api/admin/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setShowAddForm(false);
      setShowAdminForm(false);
      fetchTickets();
    }
  }, [fetchTickets]);

  // Admin quick-add: pre-fill contact from logged-in admin
  const handleAdminTicket = useCallback(async (values) => {
    const merged = {
      ...values,
      contact_name: adminUser?.display_name || "Admin",
      contact_email: adminUser?.email || "",
      contact_phone: adminUser?.phone || "",
    };
    // Default subject if empty
    if (!merged.subject?.trim()) {
      merged.subject = `Admin report — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    await handleAddTicket(merged);
  }, [adminUser, handleAddTicket]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchTickets();
  }, [fetchTickets]);

  // Close tickets (set status to closed)
  const handleBulkClose = useCallback((ids) => {
    handleSave(ids, { status: "closed" });
  }, [handleSave]);

  const handleBulkDelete = useCallback((ids) => {
    setConfirmAction({
      type: "delete",
      ids,
      message: `You are about to delete ${ids.length} ticket${ids.length > 1 ? "s" : ""} permanently.`,
      showReason: false,
    });
  }, []);

  const handleBulkSuppress = useCallback((ids) => {
    setConfirmAction({
      type: "suppress",
      ids,
      message: `Suppress ${ids.length} ticket${ids.length > 1 ? "s" : ""}?`,
      showReason: true,
    });
  }, []);

  const handleBulkUnsuppress = useCallback((ids) => {
    handleSave(ids, { suppressed: false });
  }, [handleSave]);

  const confirmExecute = useCallback(async (action) => {
    if (!confirmAction) return;
    if (action === "close") {
      // Close instead of delete
      await handleSave(confirmAction.ids, { status: "closed" });
    } else if (action === "delete" || confirmAction.type === "delete") {
      await fetch("/api/admin/tickets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmAction.ids }),
      });
    } else if (confirmAction.type === "suppress") {
      await handleSave(confirmAction.ids, { suppressed: true });
    }
    setConfirmAction(null);
    fetchTickets();
  }, [confirmAction, handleSave, fetchTickets]);

  const handleReply = useCallback(async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setReplySending(true);
    const res = await fetch("/api/admin/tickets/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: selectedTicket,
        body: replyText.trim(),
        channel: replyChannel,
      }),
    });
    if (res.ok) {
      setReplyText("");
      fetchMessages(selectedTicket);
      fetchTickets(); // refresh updated_at
    }
    setReplySending(false);
  }, [selectedTicket, replyText, replyChannel, fetchMessages, fetchTickets]);

  const handleExportCSV = useCallback(() => {
    const cols = [
      { accessorKey: "subject", header: "Subject" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "priority", header: "Priority" },
      { accessorKey: "channel", header: "Channel" },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "contact_name", header: "Contact Name" },
      { accessorKey: "contact_email", header: "Contact Email" },
      { accessorKey: "contact_phone", header: "Contact Phone" },
      { accessorKey: "assignee", header: "Assignee" },
      { accessorKey: "created_at", header: "Created" },
    ];
    exportCSV(cols, filtered, `padmagnet-tickets-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filtered]);

  // Column defs for AdminTable
  const columns = useMemo(() => [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue();
        const label = v === "in_progress" ? "In Progress" : v.charAt(0).toUpperCase() + v.slice(1);
        return <Badge color={statusColors[v] || "gray"}>{label}</Badge>;
      },
      size: 110,
      meta: {
        editable: true,
        editOptions: [
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In Progress" },
          { value: "resolved", label: "Resolved" },
          { value: "closed", label: "Closed" },
        ],
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={priorityColors[v] || "blue"}>{v}</Badge>;
      },
      size: 90,
      meta: {
        editable: true,
        editOptions: [
          { value: "low", label: "Low" },
          { value: "normal", label: "Normal" },
          { value: "high", label: "High" },
          { value: "urgent", label: "Urgent" },
        ],
      },
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600 }}>{getValue()}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "contact_name",
      header: "Contact",
      cell: ({ getValue, row }) => {
        const name = getValue();
        const email = row.original.contact_email;
        const phone = row.original.contact_phone;
        return (
          <span>
            <span style={{ fontWeight: 500 }}>{name || "—"}</span>
            {(email || phone) && (
              <span style={{ fontSize: "11px", color: COLORS.textDim, display: "block" }}>
                {email || phone}
              </span>
            )}
          </span>
        );
      },
      size: 160,
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ getValue }) => {
        const v = getValue();
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>{channelIcons[v] || "🌐"}</span>
            <span style={{ fontSize: "11px", textTransform: "uppercase", color: COLORS.textMuted }}>{v}</span>
          </span>
        );
      },
      size: 90,
      meta: {
        editable: true,
        editOptions: [
          { value: "web", label: "🌐 Web" },
          { value: "sms", label: "📱 SMS" },
          { value: "email", label: "📧 Email" },
          { value: "phone", label: "📞 Phone" },
        ],
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={categoryColors[v] || "gray"}>{v}</Badge>;
      },
      size: 110,
      meta: {
        editable: true,
        editOptions: [
          { value: "general", label: "General" },
          { value: "listings", label: "Listings" },
          { value: "access", label: "Access" },
          { value: "billing", label: "Billing" },
          { value: "bug", label: "Bug" },
          { value: "privacy", label: "Privacy" },
          { value: "unsubscribe", label: "Unsubscribe" },
        ],
      },
    },
    {
      accessorKey: "assignee",
      header: "Assignee",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: getValue() ? COLORS.text : COLORS.textDim }}>
          {getValue() || "Unassigned"}
        </span>
      ),
      size: 110,
      meta: { editable: true },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{timeAgo(getValue())}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{timeAgo(getValue())}</span>
      ),
      size: 100,
    },
  ], []);

  // Custom expanded row: ticket thread view
  const renderExpandedRow = useCallback((ticket) => {
    const isSelected = selectedTicket === ticket.id;
    if (!isSelected) {
      // Auto-select on first expansion
      setSelectedTicket(ticket.id);
    }
    const ticketMessages = isSelected ? messages : [];
    const isLoading = isSelected && messagesLoading;

    return (
      <div className="ticket-expanded">
        {/* Thread Header */}
        <div className="ticket-thread-header">
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: COLORS.text }}>{ticket.subject}</div>
            <div style={{ fontSize: "12px", color: COLORS.textDim, marginTop: 2 }}>
              {ticket.contact_name || "Unknown"} · {ticket.contact_email || ticket.contact_phone || "No contact"} · {(ticket.channel || "web").toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Badge color={statusColors[ticket.status] || "gray"}>
              {ticket.status === "in_progress" ? "In Progress" : ticket.status}
            </Badge>
            <Badge color={priorityColors[ticket.priority] || "blue"}>{ticket.priority}</Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="ticket-thread">
          {isLoading ? (
            <div style={{ padding: 20, textAlign: "center", color: COLORS.textDim }}>Loading messages…</div>
          ) : ticketMessages.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: COLORS.textDim }}>No messages yet</div>
          ) : (
            ticketMessages.map(msg => (
              <div key={msg.id} className={`ticket-message ${msg.direction}`}>
                <div className="ticket-message-bubble">
                  <div style={{ fontSize: "13px", color: COLORS.text, lineHeight: 1.5 }}>{msg.body}</div>
                  <div className="ticket-message-meta">
                    <span>{msg.sender_name || (msg.direction === "outbound" ? "Agent" : "Customer")}</span>
                    <span>{(msg.channel || "web").toUpperCase()}</span>
                    <span>{formatDate(msg.created_at)}</span>
                    {msg.direction === "outbound" && (
                      <span style={{ color: msg.delivery_status === "delivered" ? COLORS.green : COLORS.amber }}>
                        {msg.delivery_status === "delivered" ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Box */}
        <div className="ticket-reply-box">
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={replyChannel}
              onChange={e => setReplyChannel(e.target.value)}
              style={{
                padding: "6px 8px", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                borderRadius: 6, color: COLORS.brand, fontSize: "12px", fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <option value="web">🌐 Web</option>
              <option value="sms">📱 SMS</option>
              <option value="email">📧 Email</option>
            </select>
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply…"
              onKeyDown={e => { if (e.key === "Enter" && replyText.trim() && !replySending) handleReply(); }}
              style={{
                flex: 1, padding: "8px 14px", background: COLORS.bg,
                border: `1px solid ${COLORS.border}`, borderRadius: "6px",
                color: COLORS.text, fontSize: "13px", outline: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button
              onClick={handleReply}
              disabled={replySending || !replyText.trim()}
              style={{
                ...baseButton,
                background: replySending || !replyText.trim() ? COLORS.border : COLORS.brand,
                color: replySending || !replyText.trim() ? COLORS.textDim : "#000",
                fontWeight: 700,
              }}
            >
              {replySending ? "Sending…" : "Send"}
            </button>
          </div>
          {replyChannel === "sms" && replyText.length > 0 && (
            <div style={{ fontSize: "11px", color: replyText.length > 160 ? COLORS.amber : COLORS.textDim, marginTop: 4 }}>
              {replyText.length}/160 chars {replyText.length > 160 && `(${Math.ceil(replyText.length / 160)} SMS segments)`}
            </div>
          )}
        </div>
      </div>
    );
  }, [selectedTicket, messages, messagesLoading, replyText, replyChannel, replySending, handleReply]);

  const categoryOptions = [
    { value: "general", label: "General" },
    { value: "listings", label: "Listings" },
    { value: "access", label: "Access" },
    { value: "billing", label: "Billing" },
    { value: "bug", label: "Bug" },
    { value: "privacy", label: "Privacy" },
    { value: "unsubscribe", label: "Unsubscribe" },
  ];
  const channelOptions = [
    { value: "web", label: "Web" },
    { value: "sms", label: "SMS" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
  ];
  const priorityOptions = [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];

  const addFormFields = [
    { key: "subject", label: "Subject", type: "text", placeholder: "Brief description of the issue", required: true },
    { key: "contact_name", label: "Contact Name", type: "text", placeholder: "Customer name" },
    { key: "contact_email", label: "Contact Email", type: "email", placeholder: "customer@example.com" },
    { key: "contact_phone", label: "Contact Phone", type: "text", placeholder: "+1 (555) 000-0000" },
    { key: "channel", label: "Channel", type: "select", options: channelOptions },
    { key: "category", label: "Category", type: "select", options: categoryOptions },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    { key: "body", label: "Initial Message", type: "textarea", placeholder: "Describe the issue…" },
  ];

  // Admin quick-add form — fewer fields, contact auto-filled
  const adminFormFields = [
    { key: "subject", label: "Subject", type: "text", placeholder: "Quick bug note (optional — auto-generates if blank)" },
    { key: "category", label: "Category", type: "select", defaultValue: "bug", options: categoryOptions },
    { key: "priority", label: "Priority", type: "select", defaultValue: "normal", options: priorityOptions },
    { key: "channel", label: "Channel", type: "select", defaultValue: "web", options: channelOptions },
    { key: "body", label: "Details", type: "textarea", placeholder: "What did you find? (optional)" },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Open Tickets" value={openCount} sub={`${tickets.length} total`} accent={COLORS.green} />
        <StatCard label="In Progress" value={inProgressCount} sub="Being worked on" accent={COLORS.brand} />
        <StatCard label="Resolved" value={resolvedCount} sub="Completed" accent={COLORS.blue} />
        <StatCard label="SMS Tickets" value={smsCount} sub={`${tickets.length > 0 ? Math.round(smsCount / tickets.length * 100) : 0}% of total`} accent={COLORS.amber} />
      </div>

      {/* Filters & Actions Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {["all", "open", "in_progress", "resolved", "closed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            ...baseButton,
            background: statusFilter === s ? COLORS.brand + "22" : COLORS.surface,
            color: statusFilter === s ? COLORS.brand : COLORS.textMuted,
            border: `1px solid ${statusFilter === s ? COLORS.brand + "44" : COLORS.border}`,
          }}>
            {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>
              {s === "all" ? tickets.length : tickets.filter(t => t.status === s).length}
            </span>
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => { setShowAdminForm(!showAdminForm); setShowAddForm(false); }} style={{
            ...baseButton, background: COLORS.amber + "22", color: COLORS.amber, border: `1px solid ${COLORS.amber}44`, fontWeight: 700,
          }}>
            + Admin Ticket
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setShowAdminForm(false); }} style={{
            ...baseButton, background: COLORS.brand, color: "#000", fontWeight: 700,
          }}>
            + New Ticket
          </button>
          <button onClick={handleExportCSV} style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Admin Quick-Add Form */}
      {showAdminForm && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            padding: "8px 14px", marginBottom: 0, borderRadius: "8px 8px 0 0",
            background: COLORS.amber + "12", border: `1px solid ${COLORS.amber}33`, borderBottom: "none",
            fontSize: "12px", color: COLORS.amber, fontWeight: 600,
          }}>
            Filing as: {adminUser?.display_name || "Admin"} ({adminUser?.email || "—"})
          </div>
          <AddEntryForm
            fields={adminFormFields}
            onSave={handleAdminTicket}
            onCancel={() => setShowAdminForm(false)}
          />
        </div>
      )}

      {/* Add Entry Form (full) */}
      {showAddForm && (
        <AddEntryForm
          fields={addFormFields}
          onSave={handleAddTicket}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Admin Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        tableName="tickets"
        storageKey="support"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        onBulkClose={handleBulkClose}
        onBulkSuppress={handleBulkSuppress}
        onBulkUnsuppress={handleBulkUnsuppress}
        emptyMessage="No tickets yet — create one with the + New Ticket button above"
        renderExpandedRow={renderExpandedRow}
      />

      {/* Ticket Confirm Dialog — custom with Close + Delete options */}
      {confirmAction && confirmAction.type === "delete" && (
        <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message">{confirmAction.message}</p>
            <p style={{ fontSize: "13px", color: COLORS.textMuted, lineHeight: 1.6, margin: "0 0 16px" }}>
              Closing is recommended over deleting. Closed tickets remain in your history
              for tracking bugs and issues resolved over time. Deletion is permanent and
              cannot be undone.
            </p>
            <div className="confirm-actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="confirm-btn cancel" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className="confirm-btn"
                style={{ background: COLORS.brand + "22", color: COLORS.brand, border: `1px solid ${COLORS.brand}44` }}
                onClick={() => confirmExecute("close")}
              >
                Close Ticket{confirmAction.ids.length > 1 ? "s" : ""}
              </button>
              <button className="confirm-btn confirm" onClick={() => confirmExecute("delete")}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suppress Confirm Dialog — uses standard ConfirmDialog */}
      {confirmAction && confirmAction.type === "suppress" && (
        <ConfirmDialog
          message={confirmAction.message}
          showReason={confirmAction.showReason}
          onConfirm={(reason) => { handleSave(confirmAction.ids, { suppressed: true }); setConfirmAction(null); fetchTickets(); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// WAITLIST PANEL (CRUD-enabled with AdminTable)
// ============================================================
function WaitlistPanel() {
  const [entries, setEntries] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active"); // active | suppressed | all
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type, ids, message, showReason }

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/waitlist");
      if (!res.ok) throw new Error("Failed to load waitlist");
      const data = await res.json();
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWaitlist(); }, [fetchWaitlist]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (statusFilter === "active" && e.suppressed) return false;
      if (statusFilter === "suppressed" && !e.suppressed) return false;
      return true;
    });
  }, [entries, roleFilter, statusFilter]);

  const tenantCount = entries.filter(e => e.role === "tenant").length;
  const landlordCount = entries.filter(e => e.role === "landlord").length;
  const suppressedCount = entries.filter(e => e.suppressed).length;

  // CRUD handlers
  const handleAddEntry = useCallback(async (values) => {
    const res = await fetch("/api/admin/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setShowAddForm(false);
      fetchWaitlist();
    }
  }, [fetchWaitlist]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchWaitlist();
  }, [fetchWaitlist]);

  const handleBulkDelete = useCallback((ids) => {
    setConfirmAction({
      type: "delete",
      ids,
      message: `Permanently delete ${ids.length} waitlist entry${ids.length > 1 ? "ies" : "y"}?`,
      showReason: false,
    });
  }, []);

  const handleBulkSuppress = useCallback((ids) => {
    setConfirmAction({
      type: "suppress",
      ids,
      message: `Suppress ${ids.length} waitlist entry${ids.length > 1 ? "ies" : "y"}? They will be hidden from active view.`,
      showReason: true,
    });
  }, []);

  const handleBulkUnsuppress = useCallback((ids) => {
    handleSave(ids, { suppressed: false, suppressed_reason: null });
  }, [handleSave]);

  const confirmExecute = useCallback(async (reason) => {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") {
      await fetch("/api/admin/waitlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmAction.ids }),
      });
    } else if (confirmAction.type === "suppress") {
      await handleSave(confirmAction.ids, { suppressed: true, suppressed_reason: reason || null });
    }
    setConfirmAction(null);
    fetchWaitlist();
  }, [confirmAction, handleSave, fetchWaitlist]);

  const handleExportCSV = useCallback(() => {
    const cols = [
      { accessorKey: "email", header: "Email" },
      { accessorKey: "role", header: "Role" },
      { accessorKey: "suppressed", header: "Suppressed" },
      { accessorKey: "notes", header: "Notes" },
      { accessorKey: "tags", header: "Tags" },
      { accessorKey: "created_at", header: "Signed Up" },
    ];
    exportCSV(cols, filtered, `padmagnet-waitlist-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filtered]);

  // Column defs for AdminTable
  const columns = useMemo(() => [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 500 }}>{getValue()}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={v === "landlord" ? "purple" : "cyan"}>{v}</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: "suppressed",
      header: "Status",
      cell: ({ getValue, row }) => {
        if (getValue()) {
          return (
            <span title={row.original.suppressed_reason || ""} className="suppressed-badge">
              Suppressed
            </span>
          );
        }
        return <Badge color="green">Active</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: "created_at",
      header: "Signed Up",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 180,
    },
  ], []);

  const addFormFields = [
    { key: "email", label: "Email", type: "email", placeholder: "user@example.com", required: true },
    { key: "role", label: "Role", type: "select", required: true, options: [
      { value: "tenant", label: "Tenant" },
      { value: "landlord", label: "Landlord" },
    ]},
    { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional notes…" },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Signups" value={entries.length} sub="Since launch" accent={COLORS.brand} />
        <StatCard label="Tenants" value={tenantCount} sub={entries.length > 0 ? `${Math.round(tenantCount / entries.length * 100)}% of signups` : "—"} accent={COLORS.green} />
        <StatCard label="Landlords" value={landlordCount} sub={entries.length > 0 ? `${Math.round(landlordCount / entries.length * 100)}% of signups` : "—"} accent={COLORS.purple} />
        <StatCard label="Last Signup" value={entries[0] ? timeAgo(entries[0].created_at) : "—"} sub={entries[0]?.email?.split("@")[0] + "…" || "—"} accent={COLORS.amber} />
      </div>

      {/* Filters & Actions Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
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
        <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />
        {["active", "suppressed", "all"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            ...baseButton,
            background: statusFilter === s ? (s === "suppressed" ? COLORS.amberDim + "44" : COLORS.brand + "22") : COLORS.surface,
            color: statusFilter === s ? (s === "suppressed" ? COLORS.amber : COLORS.brand) : COLORS.textMuted,
            border: `1px solid ${statusFilter === s ? (s === "suppressed" ? COLORS.amber + "44" : COLORS.brand + "44") : COLORS.border}`,
          }}>
            {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "suppressed" && <span style={{ marginLeft: 6, fontSize: "11px", opacity: 0.7 }}>{suppressedCount}</span>}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{
            ...baseButton, background: COLORS.brand, color: "#000", fontWeight: 700,
          }}>
            + Add Signup
          </button>
          <button onClick={handleExportCSV} style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <AddEntryForm
          fields={addFormFields}
          onSave={handleAddEntry}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Admin Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        tableName="waitlist"
        storageKey="waitlist"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        onBulkSuppress={handleBulkSuppress}
        onBulkUnsuppress={handleBulkUnsuppress}
        emptyMessage="No waitlist entries"
      />

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          showReason={confirmAction.showReason}
          onConfirm={confirmExecute}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// PRODUCTS PANEL
// ============================================================
function ProductsPanel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hardDeleteConfirm, setHardDeleteConfirm] = useState(null); // { ids, names, typedName }

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSave = useCallback(async (ids, changes) => {
    if (changes.price_cents !== undefined) {
      const dollars = parseFloat(changes.price_cents);
      if (!isNaN(dollars)) {
        changes.price_cents = Math.round(dollars * 100);
      }
    }
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchProducts();
  }, [fetchProducts]);

  const handleToggle = useCallback(async (id, field, currentValue) => {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], changes: { [field]: !currentValue } }),
    });
    fetchProducts();
  }, [fetchProducts]);

  const handleAdd = useCallback(async (values) => {
    const priceCents = Math.round(parseFloat(values.price) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      alert("Price must be a positive number");
      return;
    }
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        description: values.description || null,
        price_cents: priceCents,
        type: values.type || "one_time",
        recurring_interval: values.type === "recurring" ? (values.recurring_interval || "month") : null,
        sort_order: parseInt(values.sort_order, 10) || 0,
        audience: values.audience || "owner",
        app_path: values.app_path || null,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(`Create failed: ${result.error}`);
      return;
    }
    setShowAddForm(false);
    fetchProducts();
  }, [fetchProducts]);

  // Soft delete (deactivate)
  const handleBulkDelete = useCallback((ids) => {
    const names = ids.map(id => {
      const p = products.find(p => p.id === id);
      return p ? p.name : id;
    }).join(", ");
    setConfirmDelete({ ids, names });
  }, [products]);

  const executeDelete = useCallback(async () => {
    if (!confirmDelete) return;
    for (const id of confirmDelete.ids) {
      await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
    setConfirmDelete(null);
    fetchProducts();
  }, [confirmDelete, fetchProducts]);

  // Hard delete (permanent removal)
  const handleBulkHardDelete = useCallback((ids) => {
    const names = ids.map(id => {
      const p = products.find(p => p.id === id);
      return p ? p.name : id;
    });
    setHardDeleteConfirm({ ids, names, typedName: "" });
  }, [products]);

  const executeHardDelete = useCallback(async () => {
    if (!hardDeleteConfirm) return;
    for (const id of hardDeleteConfirm.ids) {
      await fetch("/api/admin/products?hard=true", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
    setHardDeleteConfirm(null);
    fetchProducts();
  }, [hardDeleteConfirm, fetchProducts]);

  const addFormFields = useMemo(() => [
    { key: "name", label: "Product Name", type: "text", required: true, placeholder: "e.g. Premium 30-Day Listing" },
    { key: "audience", label: "Audience", type: "select", required: true, options: [{ value: "owner", label: "Owner" }, { value: "tenant", label: "Tenant" }], defaultValue: "owner" },
    { key: "description", label: "Description (200 char max)", type: "textarea", placeholder: "Public-facing description. Use \\n for line breaks.", maxLength: 200 },
    { key: "app_path", label: "In-App Path", type: "text", placeholder: "e.g. /my-listings" },
    { key: "price", label: "Price ($)", type: "text", required: true, placeholder: "e.g. 29.99" },
    { key: "type", label: "Type", type: "select", options: [{ value: "one_time", label: "One-Time" }, { value: "recurring", label: "Recurring" }] },
    { key: "recurring_interval", label: "Interval", type: "select", options: [{ value: "month", label: "Monthly" }, { value: "year", label: "Yearly" }] },
    { key: "sort_order", label: "Sort Order", type: "text", placeholder: "0" },
  ], []);

  const activeCount = products.filter(p => p.is_active).length;
  const implementedCount = products.filter(p => p.is_implemented).length;
  const avgPrice = products.length > 0
    ? (products.reduce((sum, p) => sum + p.price_cents, 0) / products.length / 100).toFixed(2)
    : "0.00";

  const ownerProducts = products.filter(p => p.audience === "owner" || !p.audience);
  const tenantProducts = products.filter(p => p.audience === "tenant");

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600 }}>{getValue()}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "audience",
      header: "Audience",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={v === "tenant" ? "cyan" : "blue"}>
          {(v || "owner").toUpperCase()}
        </Badge>;
      },
      size: 90,
      meta: {
        editable: true,
        editOptions: [
          { value: "owner", label: "Owner" },
          { value: "tenant", label: "Tenant" },
        ],
      },
    },
    {
      accessorKey: "description",
      header: "Public Product Description",
      cell: ({ getValue }) => {
        const val = getValue() || "";
        const charCount = val.length;
        return (
          <div style={{ fontSize: "13px", color: COLORS.textMuted, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.4 }}>
            {val ? val.replace(/\\n/g, "\n") : "—"}
            {val && <span style={{ display: "block", fontSize: "11px", color: COLORS.textDim, marginTop: 2 }}>{charCount}/200</span>}
          </div>
        );
      },
      meta: { editable: true },
      size: 320,
    },
    {
      accessorKey: "app_path",
      header: "App Path",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", fontFamily: "monospace", color: COLORS.textMuted }}>
          {getValue() || "—"}
        </span>
      ),
      meta: { editable: true },
      size: 140,
    },
    {
      accessorKey: "price_cents",
      header: "Price",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
          ${(getValue() / 100).toFixed(2)}
        </span>
      ),
      meta: { editable: true },
      size: 100,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={v === "one_time" ? "blue" : "purple"}>
          {v === "one_time" ? "One-Time" : "Recurring"}
        </Badge>;
      },
      size: 110,
      meta: {
        editable: true,
        editOptions: [
          { value: "one_time", label: "One-Time" },
          { value: "recurring", label: "Recurring" },
        ],
      },
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }) => {
        const val = row.original.is_active;
        return (
          <span
            onClick={() => handleToggle(row.original.id, "is_active", val)}
            style={{
              display: "inline-block", padding: "2px 10px", borderRadius: 12,
              fontSize: "11px", fontWeight: 700, cursor: "pointer",
              background: val ? "#052e16" : "#1e293b",
              color: val ? COLORS.green : COLORS.textDim,
              border: `1px solid ${val ? COLORS.green + "44" : COLORS.border}`,
              userSelect: "none",
            }}
          >
            {val ? "ON" : "OFF"}
          </span>
        );
      },
      size: 80,
      enableSorting: false,
    },
    {
      accessorKey: "is_implemented",
      header: "Wired to App",
      cell: ({ row }) => {
        const val = row.original.is_implemented;
        return (
          <span
            onClick={() => handleToggle(row.original.id, "is_implemented", val)}
            style={{
              display: "inline-block", padding: "2px 10px", borderRadius: 12,
              fontSize: "11px", fontWeight: 700, cursor: "pointer",
              background: val ? "#052e16" : "#450a0a",
              color: val ? COLORS.green : COLORS.red,
              border: `1px solid ${val ? COLORS.green + "44" : COLORS.red + "44"}`,
              userSelect: "none",
            }}
          >
            {val ? "LIVE" : "NOT WIRED"}
          </span>
        );
      },
      size: 110,
      enableSorting: false,
    },
    {
      accessorKey: "sort_order",
      header: "App Display Order",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "13px", color: COLORS.textMuted }}>{getValue()}</span>
      ),
      meta: { editable: true },
      size: 70,
    },
    {
      accessorKey: "updated_at",
      header: "Last Modified",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDateFull(getValue())}</span>
      ),
      size: 180,
    },
  ], [handleToggle]);

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Products" value={products.length} sub="In catalog" accent={COLORS.brand} />
        <StatCard label="Active" value={activeCount} sub="Products currently available to send to the PadMagnet App. *May still need to be wired to a custom or current page." accent={COLORS.green} />
        <StatCard label="Implemented" value={implementedCount} sub="Wired into app" accent={COLORS.purple} />
        <StatCard label="Avg Price" value={`$${avgPrice}`} sub="Across all products" accent={COLORS.amber} />
      </div>

      {/* Info Banner */}
      <div style={{
        background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
        padding: "12px 16px", marginBottom: 20, fontSize: "13px", color: COLORS.textMuted, lineHeight: 1.5,
      }}>
        Descriptions and pricing entered here flow to the PadMagnet App. Make product descriptions public-friendly and punchy.
        Strictly respect the 200-character field length. Use <code style={{ background: "#0f172a", padding: "1px 5px", borderRadius: 4, fontSize: "12px", color: COLORS.brand }}>{"\\n"}</code> for line breaks.
      </div>

      {/* Add Button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: showAddForm ? COLORS.surface : COLORS.brand,
            color: showAddForm ? COLORS.text : "#000",
            fontWeight: 600, fontSize: "13px",
          }}
        >
          {showAddForm ? "Cancel" : "+ Add Product"}
        </button>
        <span style={{ fontSize: "13px", color: COLORS.textMuted }}>
          Click toggles to flip Active/Wired. Double-click name, description, price, path, or order to edit inline.
        </span>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{ marginBottom: 20 }}>
          <AddEntryForm
            fields={addFormFields}
            onSave={handleAdd}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Create Product"
            savingLabel="Creating…"
          />
        </div>
      )}

      {/* Owner Products Section */}
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: COLORS.text, margin: "24px 0 12px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8 }}>
        Property Owner Products and Services
      </h3>
      <AdminTable
        columns={columns}
        data={ownerProducts}
        loading={loading}
        error={error}
        tableName="products"
        storageKey="products-owner"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        onBulkHardDelete={handleBulkHardDelete}
        emptyMessage="No owner products in catalog yet"
        renderExpandedRow={(row) => <AuditHistory tableName="products" rowId={row.id} />}
      />

      {/* Tenant Products Section */}
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: COLORS.text, margin: "32px 0 12px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8 }}>
        Tenant Products and Services
      </h3>
      <AdminTable
        columns={columns}
        data={tenantProducts}
        loading={loading}
        error={error}
        tableName="products"
        storageKey="products-tenant"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        onBulkHardDelete={handleBulkHardDelete}
        emptyMessage="No tenant products yet"
        renderExpandedRow={(row) => <AuditHistory tableName="products" rowId={row.id} />}
      />

      {/* Soft Delete Confirmation */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px" }}>
              Deactivate {confirmDelete.ids.length} product{confirmDelete.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>
              {confirmDelete.names}
            </p>
            <p style={{ fontSize: "12px", color: COLORS.textDim, marginBottom: 16 }}>
              Products will be deactivated (soft delete), not permanently removed.
            </p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="confirm-btn confirm" onClick={executeDelete}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation — requires typing product name */}
      {hardDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setHardDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px", color: COLORS.red }}>
              Permanently remove {hardDeleteConfirm.ids.length} product{hardDeleteConfirm.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>
              This will permanently delete: <strong>{hardDeleteConfirm.names.join(", ")}</strong>
            </p>
            <p style={{ fontSize: "12px", color: COLORS.red, marginBottom: 12 }}>
              This action cannot be undone. The product will be removed from the database.
            </p>
            <p style={{ fontSize: "13px", color: COLORS.textMuted, marginBottom: 6 }}>
              Type <strong>{hardDeleteConfirm.names[0]}</strong> to confirm:
            </p>
            <input
              type="text"
              value={hardDeleteConfirm.typedName}
              onChange={e => setHardDeleteConfirm(prev => ({ ...prev, typedName: e.target.value }))}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6,
                border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                color: COLORS.text, fontSize: "14px", marginBottom: 16,
                boxSizing: "border-box",
              }}
              autoFocus
              placeholder={hardDeleteConfirm.names[0]}
            />
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setHardDeleteConfirm(null)}>Cancel</button>
              <button
                className="confirm-btn confirm"
                disabled={hardDeleteConfirm.typedName !== hardDeleteConfirm.names[0]}
                onClick={executeHardDelete}
                style={{
                  opacity: hardDeleteConfirm.typedName !== hardDeleteConfirm.names[0] ? 0.4 : 1,
                  background: "#7f1d1d",
                }}
              >
                Permanently Remove
              </button>
            </div>
          </div>
        </div>
      )}
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
// USERS PANEL (Admin Profiles — CRUD-enabled with AdminTable)
// ============================================================
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = useCallback(async (ids, changes) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, changes }),
    });
    fetchUsers();
  }, [fetchUsers]);

  const handleInvite = useCallback(async (values) => {
    const res = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email, display_name: values.display_name }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(`Invite failed: ${result.error}`);
      return;
    }
    setShowInviteForm(false);
    fetchUsers();
  }, [fetchUsers]);

  const handleBulkDelete = useCallback((ids) => {
    const names = ids.map(id => {
      const u = users.find(u => u.id === id);
      return u ? `${u.display_name || u.email}` : id;
    }).join(", ");
    setConfirmDelete({ ids, names });
  }, [users]);

  const executeDelete = useCallback(async () => {
    if (!confirmDelete) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: confirmDelete.ids }),
    });
    if (!res.ok) {
      const result = await res.json();
      alert(`Delete failed: ${result.error}`);
    }
    setConfirmDelete(null);
    fetchUsers();
  }, [confirmDelete, fetchUsers]);

  const inviteFormFields = useMemo(() => [
    { key: "display_name", label: "First Name", type: "text", required: true, placeholder: "e.g. Sarah" },
    { key: "email", label: "Email Address", type: "text", required: true, placeholder: "e.g. sarah@company.com" },
  ], []);

  const superAdminCount = users.filter(u => u.role === "super_admin").length;
  const adminCount = users.filter(u => u.role === "admin").length;

  // Auth status helper
  const getAuthStatus = (authStatus) => {
    if (!authStatus) return { label: "Active", color: COLORS.green, bg: "#052e16" };
    if (authStatus.last_sign_in_at) return { label: "Authenticated", color: "#4ade80", bg: "#052e16" };
    if (authStatus.invited_at) return { label: "Invited (Pending)", color: COLORS.amber, bg: "#1a1400" };
    return { label: "Active", color: COLORS.green, bg: "#052e16" };
  };

  const columns = useMemo(() => [
    {
      accessorKey: "display_name",
      header: "Display Name",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 600 }}>{getValue() || "—"}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span style={{ fontWeight: 500 }}>{getValue()}</span>
      ),
      meta: { editable: true },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "13px", color: getValue() ? COLORS.text : COLORS.textDim }}>
          {getValue() || "Not set"}
        </span>
      ),
      meta: { editable: true },
      size: 140,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={v === "super_admin" ? "purple" : "cyan"}>
          {v === "super_admin" ? "Super Admin" : "Admin"}
        </Badge>;
      },
      size: 120,
      meta: {
        editable: true,
        editOptions: [
          { value: "admin", label: "Admin" },
          { value: "super_admin", label: "Super Admin" },
        ],
      },
    },
    {
      id: "auth_status",
      header: "Status",
      accessorFn: (row) => row.auth_status,
      cell: ({ row }) => {
        const s = getAuthStatus(row.original.auth_status);
        return (
          <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 6,
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.02em",
            background: s.bg, color: s.color, border: `1px solid ${s.color}33`,
          }}>
            {s.label}
          </span>
        );
      },
      size: 140,
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 160,
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{timeAgo(getValue())}</span>
      ),
      size: 100,
    },
  ], []);

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Total Users" value={users.length} sub="Admin accounts" accent={COLORS.brand} />
        <StatCard label="Super Admins" value={superAdminCount} sub="Full access" accent={COLORS.purple} />
        <StatCard label="Admins" value={adminCount} sub="Standard access" accent={COLORS.green} />
        <StatCard label="Last Added" value={users.length > 0 ? timeAgo(users[users.length - 1]?.created_at) : "—"} sub={users[users.length - 1]?.display_name || "—"} accent={COLORS.amber} />
      </div>

      {/* Invite Button + Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: showInviteForm ? COLORS.surface : COLORS.amber,
            color: showInviteForm ? COLORS.text : "#000",
            fontWeight: 600, fontSize: "13px",
          }}
        >
          {showInviteForm ? "Cancel" : "+ Invite Admin"}
        </button>
        <span style={{ fontSize: "13px", color: COLORS.textMuted }}>
          Double-click any cell to edit. Changes are saved immediately and logged to the audit trail.
        </span>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            padding: "10px 14px", marginBottom: 12, borderRadius: 8,
            background: "#1a1400", border: `1px solid ${COLORS.amber}33`,
            fontSize: "13px", color: COLORS.amber,
          }}>
            An invite email will be sent. The new user will be created as a regular Admin (not Super Admin).
          </div>
          <AddEntryForm
            fields={inviteFormFields}
            onSave={handleInvite}
            onCancel={() => setShowInviteForm(false)}
            submitLabel="Email Admin Invite Link"
            savingLabel="Sending invite…"
          />
        </div>
      )}

      {/* Admin Table */}
      <AdminTable
        columns={columns}
        data={users}
        loading={loading}
        error={error}
        tableName="profiles"
        storageKey="users"
        onSave={handleSave}
        onBulkDelete={handleBulkDelete}
        emptyMessage="No user profiles yet"
      />

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="confirm-message" style={{ fontWeight: 700, fontSize: "15px" }}>
              Delete {confirmDelete.ids.length} user{confirmDelete.ids.length > 1 ? "s" : ""}?
            </p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 4px" }}>
              {confirmDelete.names}
            </p>
            <div style={{
              padding: "10px 14px", marginTop: 12, marginBottom: 16, borderRadius: 8,
              background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)",
              fontSize: "12px", color: "#f87171", lineHeight: 1.5,
            }}>
              DANGER: This permanently deletes the user profile AND their Supabase auth account.
              They will lose all access and cannot log in. This action cannot be undone.
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="confirm-btn confirm"
                style={{ background: "#dc2626" }}
                onClick={executeDelete}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AUDIT LOG PANEL
// ============================================================
// ── Audit Log default view ──────────────────────────────────
// Change these anytime to set what the panel shows on load.
const AUDIT_DEFAULTS = {
  table: "waitlist",  // "" = all tables, or "waitlist", "listings", "idx_feeds"
  action: "",         // "" = all actions, or "create", "update", "delete", "suppress", "unsuppress"
  limit: 50,          // 25, 50, or 100
};
// ────────────────────────────────────────────────────────────

const AUDIT_ACTION_BADGE_COLORS = {
  create: "green", invite: "green", update: "blue", delete: "red",
  reply: "purple", suppress: "amber", unsuppress: "cyan",
};

function AuditLogPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState(AUDIT_DEFAULTS.table);
  const [actionFilter, setActionFilter] = useState(AUDIT_DEFAULTS.action);
  const [limit, setLimit] = useState(AUDIT_DEFAULTS.limit);

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tableFilter) params.set("table", tableFilter);
      if (actionFilter) params.set("action", actionFilter);
      params.set("limit", String(limit));
      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (res.ok) setEntries(await res.json());
    } catch {
      // silent
    }
    setLoading(false);
  }, [tableFilter, actionFilter, limit]);

  useEffect(() => { fetchAuditLog(); }, [fetchAuditLog]);

  const columns = useMemo(() => [
    {
      accessorKey: "table_name",
      header: "Table",
      cell: ({ getValue }) => (
        <span style={{ fontFamily: "monospace", color: COLORS.brand, fontSize: "12px" }}>{getValue()}</span>
      ),
      size: 100,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ getValue }) => {
        const v = getValue();
        return <Badge color={AUDIT_ACTION_BADGE_COLORS[v] || "gray"}>{v}</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: "row_id",
      header: "Row ID",
      cell: ({ getValue }) => {
        const v = getValue();
        return <span style={{ fontFamily: "monospace", fontSize: "11px", color: COLORS.textDim }}>{v?.slice(0, 8)}…</span>;
      },
      size: 110,
    },
    {
      id: "details",
      header: "Details",
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.field_changed) {
          return (
            <span style={{ fontSize: "12px", color: COLORS.textMuted }}>
              <span style={{ color: COLORS.text }}>{entry.field_changed}</span>
              {entry.old_value && entry.new_value && (
                <>: <span style={{ color: COLORS.red, textDecoration: "line-through" }}>{entry.old_value?.slice(0, 30)}</span> → <span style={{ color: COLORS.green }}>{entry.new_value?.slice(0, 30)}</span></>
              )}
            </span>
          );
        }
        if (entry.action === "create" || entry.action === "invite") return <span style={{ fontSize: "12px", color: COLORS.green }}>New entry created</span>;
        if (entry.action === "delete") return <span style={{ fontSize: "12px", color: COLORS.red }}>Entry deleted</span>;
        return <span style={{ fontSize: "12px", color: COLORS.textDim }}>—</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Time",
      cell: ({ getValue }) => (
        <span style={{ fontSize: "12px", color: COLORS.textDim }}>{formatDate(getValue())}</span>
      ),
      size: 160,
    },
  ], []);

  const renderExpandedRow = useCallback((entry) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {[
        ["Row ID", entry.row_id || "—"],
        ["Admin User", entry.admin_user_id || "system"],
        ["Field Changed", entry.field_changed || "—"],
        ["Old Value", entry.old_value || "—"],
        ["New Value", entry.new_value || "—"],
        ["Metadata", entry.metadata ? JSON.stringify(entry.metadata) : "—"],
      ].map(([label, val]) => (
        <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "8px 12px" }}>
          <div style={{ fontSize: "10px", color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
          <div style={{ fontSize: "12px", color: COLORS.text, marginTop: 2, wordBreak: "break-all" }}>{val}</div>
        </div>
      ))}
    </div>
  ), []);

  return (
    <div>
      <div className="audit-panel-filters">
        <select className="audit-panel-select" value={tableFilter} onChange={e => setTableFilter(e.target.value)}>
          <option value="">All Tables</option>
          <option value="waitlist">Waitlist</option>
          <option value="tickets">Tickets</option>
          <option value="profiles">Users</option>
          <option value="listings">Listings</option>
          <option value="idx_feeds">IDX Feeds</option>
        </select>
        <select className="audit-panel-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="reply">Reply</option>
          <option value="invite">Invite</option>
          <option value="suppress">Suppress</option>
          <option value="unsuppress">Unsuppress</option>
        </select>
        <select className="audit-panel-select" value={limit} onChange={e => setLimit(Number(e.target.value))}>
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
        </select>
        <button onClick={fetchAuditLog} style={{ ...baseButton, background: COLORS.surface, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}>
          Refresh
        </button>
      </div>

      <AdminTable
        columns={columns}
        data={entries}
        loading={loading}
        tableName="admin_audit_log"
        storageKey="audit-log"
        emptyMessage="No audit log entries yet. Actions taken in admin panels will appear here."
        renderExpandedRow={renderExpandedRow}
      />
    </div>
  );
}

// ============================================================
// BACKLOG PANEL
// ============================================================
const STATUS_CONFIG = {
  done:          { label: "Done",        bg: "#166534", color: "#4ade80" },
  "in-progress": { label: "In Progress", bg: "#92400e", color: "#fbbf24" },
  pending:       { label: "Pending",     bg: "#1e3a5f", color: "#60a5fa" },
  blocked:       { label: "Blocked",     bg: "#991b1b", color: "#f87171" },
  deferred:      { label: "Deferred",    bg: "#3b3b3b", color: "#a1a1aa" },
};

function BacklogPanel() {
  const [collapsed, setCollapsed] = useState({});

  const toggle = (cat) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  // Stats
  const allItems = BACKLOG.flatMap(c => c.items);
  const total = allItems.length;
  const done = allItems.filter(i => i.status === "done").length;
  const blocked = allItems.filter(i => i.status === "blocked").length;
  const inProgress = allItems.filter(i => i.status === "in-progress").length;
  const remaining = total - done;

  const statCards = [
    { label: "Total Tasks", value: total, color: COLORS.brand },
    { label: "Done", value: done, color: COLORS.green },
    { label: "Remaining", value: remaining, color: COLORS.amber },
    { label: "In Progress", value: inProgress, color: COLORS.blue },
    { label: "Blocked", value: blocked, color: COLORS.red },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 10, padding: "16px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 600 }}>Overall Progress</span>
          <span style={{ fontSize: 13, color: COLORS.brand, fontWeight: 700 }}>{total > 0 ? Math.round((done / total) * 100) : 0}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: COLORS.border, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${total > 0 ? (done / total) * 100 : 0}%`, background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.brand})`, borderRadius: 4, transition: "width 0.3s ease" }} />
        </div>
      </div>

      {/* Categories */}
      {BACKLOG.map(cat => {
        const isOpen = !collapsed[cat.category];
        const catDone = cat.items.filter(i => i.status === "done").length;
        return (
          <div key={cat.category} style={{ marginBottom: 16 }}>
            <div
              onClick={() => toggle(cat.category)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", cursor: "pointer", userSelect: "none",
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: isOpen ? "10px 10px 0 0" : 10,
                transition: "border-radius 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>&#9654;</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{cat.category}</span>
              </div>
              <span style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600 }}>{catDone}/{cat.items.length}</span>
            </div>
            {isOpen && (
              <div style={{ border: `1px solid ${COLORS.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                {cat.items.map((item, idx) => {
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                  return (
                    <div key={item.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px",
                      background: idx % 2 === 0 ? "transparent" : COLORS.surface,
                      borderBottom: idx < cat.items.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: sc.bg, color: sc.color, whiteSpace: "nowrap", minWidth: 72, textAlign: "center",
                      }}>
                        {sc.label}
                      </span>
                      <span style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, minWidth: 48 }}>{item.id}</span>
                      <span style={{ fontSize: 13, color: COLORS.text, flex: 1 }}>{item.title}</span>
                      {item.notes && <span style={{ fontSize: 11, color: COLORS.textDim, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.notes}>{item.notes}</span>}
                      {item.date && <span style={{ fontSize: 11, color: COLORS.textDim, whiteSpace: "nowrap" }}>{item.date}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
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
  { id: "products", label: "App Products", icon: "📦" },
  { id: "billing", label: "Billing", icon: "💳" },
  { id: "users", label: "Users", icon: "👤" },
  { id: "audit", label: "Audit Log", icon: "📝" },
  { id: "backlog", label: "Backlog", icon: "📋" },
];

export default function PadMagnetAdmin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const router = useRouter();

  // Fetch open ticket count for sidebar badge + overview
  const refreshTicketCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tickets?status=open");
      if (res.ok) {
        const data = await res.json();
        setOpenTicketCount(data.length);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refreshTicketCount();
    // Refresh every 60 seconds
    const interval = setInterval(refreshTicketCount, 60000);
    return () => clearInterval(interval);
  }, [refreshTicketCount]);

  // Also refresh when switching to/from support tab
  useEffect(() => {
    if (activeTab === "support" || activeTab === "overview") {
      refreshTicketCount();
    }
  }, [activeTab, refreshTicketCount]);

  const handleLogout = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }, [router]);

  const panels = {
    overview: <OverviewPanel openTicketCount={openTicketCount} />,
    waitlist: <WaitlistPanel />,
    feeds: <FeedsPanel />,
    padscore: <PadScorePanel />,
    listings: <ListingsPanel />,
    support: <SupportPanel onTicketChange={refreshTicketCount} />,
    products: <ProductsPanel />,
    billing: <BillingPanel />,
    users: <UsersPanel />,
    audit: <AuditLogPanel />,
    backlog: <BacklogPanel />,
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
          <img
            src="/logo/padmagnet-icon-120.png"
            alt="PadMagnet"
            width={32}
            height={32}
            style={{ borderRadius: "8px", flexShrink: 0 }}
          />
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
                {isSupport && openTicketCount > 0 && (
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
                    {openTicketCount}
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
            <button onClick={handleLogout} style={{
              ...baseButton, width: "100%", marginTop: 10,
              background: COLORS.border, color: COLORS.textMuted,
              fontSize: "11px", padding: "6px 0",
            }}>
              Sign Out
            </button>
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
