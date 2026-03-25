// Shared constants, styles, and utility components for admin dashboard panels

export const COLORS = {
  bg: "#0A0E17",
  surface: "#111827",
  surfaceHover: "#1a2236",
  border: "#1e293b",
  borderLight: "#334155",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  brand: "#3B82F6",      // accent blue
  brandDim: "#2563EB",
  green: "#22c55e",
  greenDim: "#166534",
  amber: "#f59e0b",
  amberDim: "#92400e",
  red: "#ef4444",
  redDim: "#991b1b",
  blue: "#3b82f6",
  purple: "#a78bfa",
};

export const baseButton = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "none",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
  fontFamily: "'DM Sans', sans-serif",
};

export function Badge({ color = "blue", children, style }) {
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

export function StatCard({ label, value, sub, accent = COLORS.brand }) {
  return (
    <div style={{
      background: COLORS.surface, borderRadius: "8px", padding: "12px 14px",
      border: `1px solid ${COLORS.border}`, flex: "1 1 140px", minWidth: 120,
    }}>
      <div style={{ fontSize: "11px", color: COLORS.textDim, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: accent, lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: COLORS.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function timeAgo(dateStr) {
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

export function formatDate(dateStr) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

export function formatDateFull(dateStr) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}
