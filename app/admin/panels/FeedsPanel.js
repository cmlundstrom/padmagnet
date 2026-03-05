'use client';

import { useState } from 'react';
import { COLORS, baseButton, Badge, timeAgo, formatDate } from '../shared';
import { DEMO_FEEDS, DEMO_SYNC_LOGS } from '../demo-data';

export default function FeedsPanel() {
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
              <div style={{ fontSize: "11px", color: COLORS.textDim }}>Every {feed.poll_interval_min || "\u2014"}min · {feed.coverage_counties.join(", ")}</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
              <button onClick={e => { e.stopPropagation(); }} style={{ ...baseButton, background: COLORS.greenDim, color: COLORS.green, fontSize: "11px", padding: "4px 10px" }}>
                \u25B6 Sync Now
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
                Configure how MLS fields map to PadMagnet properties. SUPABASE: SELECT * FROM idx_field_mappings WHERE feed_id = &apos;{feed.id}&apos;
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
                    <div style={{ color: COLORS.textDim, textAlign: "center", fontSize: "12px" }}>\u2192</div>
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
