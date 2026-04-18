'use client';

import { useState } from 'react';
import { COLORS, baseButton } from '../shared';
const DEMO_LISTINGS = [
  { id: "p1", mls_number: "RX-10998871", address_line1: "1425 SE Coral Reef St", city: "Stuart", state: "FL", zip: "34996", property_type: "sfh", rent_amount: 2800, beds: 3, baths: 2, sqft: 1650, display_status: "active", quality_score: 88, days_on_market: 5, pet_policy: "allowed", fenced_yard: true, list_date: "2026-02-20" },
  { id: "p2", mls_number: "RX-10998455", address_line1: "800 S Ocean Blvd #402", city: "Jensen Beach", state: "FL", zip: "34957", property_type: "apartment", rent_amount: 2200, beds: 2, baths: 2, sqft: 1100, display_status: "active", quality_score: 72, days_on_market: 22, pet_policy: "not_allowed", fenced_yard: false, list_date: "2026-02-03" },
  { id: "p4", mls_number: "RX-10996889", address_line1: "221 SW Palm City Rd", city: "Stuart", state: "FL", zip: "34994", property_type: "sfh", rent_amount: 3500, beds: 4, baths: 3, sqft: 2400, display_status: "active", quality_score: 95, days_on_market: 2, pet_policy: "allowed", fenced_yard: true, list_date: "2026-02-23" },
];

const DEFAULT_PADSCORE = {
  budget_over: { enabled: true, weight: 35, label: "Over Budget", desc: "Penalty when rent exceeds renter max" },
  property_type: { enabled: true, weight: 25, label: "Wrong Type", desc: "Wrong property type for renter" },
  beds_short: { enabled: true, weight: 18, label: "Too Few Beds", desc: "Fewer bedrooms than minimum" },
  baths_short: { enabled: true, weight: 12, label: "Too Few Baths", desc: "Fewer bathrooms than minimum" },
  location_inside_radius: { enabled: true, weight: 14, label: "Distance (in radius)", desc: "Gentle falloff within search area" },
  location_outside_radius: { enabled: true, weight: 40, label: "Distance (outside)", desc: "Sharp cliff outside search radius" },
  pets_not_allowed: { enabled: true, weight: 50, label: "No Pets (dealbreaker)", desc: "Pet owner + no pets allowed" },
  pets_unknown: { enabled: true, weight: 10, label: "Pets Unknown", desc: "Unknown pet policy for pet owner" },
  fenced_yard_bonus: { enabled: true, weight: 8, label: "Fenced Yard Bonus", desc: "Bonus for fenced yard + pet owner", isBonus: true },
  fenced_yard_missing: { enabled: true, weight: 12, label: "No Fenced Yard", desc: "No fence for pet owner" },
  association_mismatch: { enabled: true, weight: 50, label: "Association Mismatch", desc: "Association preference doesn't match" },
  furnished_mismatch: { enabled: true, weight: 6, label: "Furnished Mismatch", desc: "Furnished preference doesn't match" },
  lease_too_short: { enabled: true, weight: 35, label: "Lease Too Short", desc: "Listing lease shorter than needed" },
  stale_listing_major: { enabled: true, weight: 5, label: "Stale (60+ days)", desc: "Soft penalty for old listings" },
  stale_listing_minor: { enabled: true, weight: 2, label: "Stale (30-60 days)", desc: "Very soft penalty" },
  no_photos: { enabled: true, weight: 35, label: "No Photos", desc: "Listing has no photos available" },
  price_drop_recent: { enabled: true, weight: 15, label: "Recent Price Drop", desc: "Bonus for price drop within 7 days", isBonus: true },
};

export default function PadScorePanel() {
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
    { title: "Lifestyle", keys: ["association_mismatch", "furnished_mismatch"] },
    { title: "Lease & Freshness", keys: ["lease_too_short", "stale_listing_major", "stale_listing_minor"] },
    { title: "Presentation & Pricing", keys: ["no_photos", "price_drop_recent"] },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>PadScore\u2122 Configuration</h3>
          <p style={{ fontSize: "13px", color: COLORS.textDim, margin: "4px 0 0" }}>
            Max penalty pool: <span style={{ color: COLORS.red, fontWeight: 700 }}>{totalMaxPenalty} pts</span> ·
            Bonus pool: <span style={{ color: COLORS.green, fontWeight: 700 }}>+{totalBonus} pts</span> ·
            Base score: 100
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span style={{ color: COLORS.green, fontSize: "13px", fontWeight: 600 }}>\u2713 Saved to Supabase</span>}
          <button onClick={handleSave} disabled={!dirty} style={{
            ...baseButton,
            background: dirty ? COLORS.brand : COLORS.border,
            color: dirty ? "#000" : COLORS.textDim,
            opacity: dirty ? 1 : 0.5,
          }}>
            {dirty ? "\uD83D\uDCBE Save Config" : "No Changes"}
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
        <h4 style={{ color: COLORS.textMuted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Score Preview \u2014 Sample Tenant vs Listings</h4>
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
            if (config.no_photos.enabled && (!listing.photos || listing.photos === 0)) score -= config.no_photos.weight;
            if (config.price_drop_recent.enabled && listing.price_dropped) score += config.price_drop_recent.weight;
            score = Math.max(0, Math.min(115, score));
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
