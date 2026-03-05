import { COLORS, Badge, StatCard, timeAgo, formatDate } from '../shared';
import { DEMO_FEEDS, DEMO_SYNC_LOGS, DEMO_LISTINGS } from '../demo-data';

export default function OverviewPanel({ openTicketCount = 0 }) {
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
