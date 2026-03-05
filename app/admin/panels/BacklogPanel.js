'use client';

import { useState } from 'react';
import { COLORS } from '../shared';
import { BACKLOG } from '../backlog-data';

const STATUS_CONFIG = {
  done:          { label: "Done",        bg: "#166534", color: "#4ade80" },
  "in-progress": { label: "In Progress", bg: "#92400e", color: "#fbbf24" },
  pending:       { label: "Pending",     bg: "#1e3a5f", color: "#60a5fa" },
  blocked:       { label: "Blocked",     bg: "#991b1b", color: "#f87171" },
  deferred:      { label: "Deferred",    bg: "#3b3b3b", color: "#a1a1aa" },
};

export default function BacklogPanel() {
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
