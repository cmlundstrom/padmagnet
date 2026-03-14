"use client";

import { useState, useEffect, useCallback } from "react";
import { COLORS, baseButton } from "../shared";

export default function DisclaimersPanel() {
  const [ownerFooter, setOwnerFooter] = useState("");
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchFooter = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config?keys=owner_listing_footer");
      if (res.ok) {
        const data = await res.json();
        setOwnerFooter(data.owner_listing_footer || "");
      }
    } catch {
      // fall through
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFooter(); }, [fetchFooter]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "owner_listing_footer", value: ownerFooter }),
      });
      if (res.ok) setSaved(true);
    } catch {
      // fall through
    } finally {
      setSaving(false);
    }
  };

  const mlsDisclaimer =
    "The data relating to real estate for sale/lease on this web site come in part from a cooperative data exchange program of the multiple listing service (MLS) in which this real estate firm participates. Listings held by brokerage firms other than PadMagnet are marked with the listing broker's name. Information is deemed reliable but is not guaranteed.";

  return (
    <div>
      <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
        Listing Disclaimers
      </h2>
      <p style={{ color: COLORS.textMuted, fontSize: "13px", marginTop: 4, marginBottom: 24 }}>
        Footer text displayed at the bottom of listing detail pages in the app.
      </p>

      {/* MLS Disclaimer — read-only */}
      <div style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>MLS / IDX Listings</span>
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 8px",
            borderRadius: 4, background: COLORS.redDim, color: COLORS.red,
          }}>
            LOCKED
          </span>
        </div>
        <p style={{
          color: COLORS.textMuted, fontSize: "12px", marginBottom: 12, lineHeight: 1.5,
        }}>
          This disclaimer is required by the MLS/IDX agreement and cannot be edited.
          It appears on all listings sourced from the Bridge Interactive feed.
        </p>
        <div style={{
          background: COLORS.bg, border: `1px solid ${COLORS.border}`,
          borderRadius: 6, padding: 14, fontSize: "12px",
          color: COLORS.textDim, lineHeight: 1.6, fontStyle: "italic",
        }}>
          © {new Date().getFullYear()} SEFMLS. All rights reserved.
          <br /><br />
          {mlsDisclaimer}
        </div>
      </div>

      {/* Owner Disclaimer — editable */}
      <div style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Owner-Created Listings</span>
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 8px",
            borderRadius: 4, background: COLORS.greenDim, color: COLORS.green,
          }}>
            EDITABLE
          </span>
        </div>
        <p style={{
          color: COLORS.textMuted, fontSize: "12px", marginBottom: 12, lineHeight: 1.5,
        }}>
          This text appears on all listings submitted directly by property owners.
          Changes apply universally to all owner listings in the app.
        </p>

        {loading ? (
          <p style={{ color: COLORS.textDim, fontSize: "13px" }}>Loading…</p>
        ) : (
          <>
            <textarea
              value={ownerFooter}
              onChange={(e) => { setOwnerFooter(e.target.value); setSaved(false); }}
              rows={5}
              style={{
                width: "100%",
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: 14,
                fontSize: "13px",
                color: COLORS.text,
                lineHeight: 1.6,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
              <button
                onClick={handleSave}
                disabled={saved || saving}
                style={{
                  ...baseButton,
                  background: saved ? COLORS.border : COLORS.brand,
                  color: saved ? COLORS.textDim : "#000",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : saved ? "Saved" : "Save Changes"}
              </button>
              {!saved && (
                <span style={{ fontSize: "12px", color: COLORS.amber }}>Unsaved changes</span>
              )}
            </div>
          </>
        )}

        {/* Preview */}
        <div style={{ marginTop: 20 }}>
          <span style={{
            fontSize: "11px", fontWeight: 600, color: COLORS.textMuted,
            textTransform: "uppercase", letterSpacing: 1,
          }}>
            Preview
          </span>
          <div style={{
            marginTop: 8, background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6, padding: 14,
            fontSize: "12px", color: COLORS.textDim, lineHeight: 1.6,
            fontStyle: "italic",
          }}>
            © {new Date().getFullYear()} PadMagnet LLC. All rights reserved.
            <br /><br />
            {ownerFooter || "No disclaimer text set."}
          </div>
        </div>
      </div>
    </div>
  );
}
