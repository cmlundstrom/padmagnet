import { COLORS, baseButton, StatCard } from '../shared';

export default function BillingPanel() {
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
        <div style={{ fontSize: "40px", marginBottom: 12 }}>{"\uD83D\uDCB3"}</div>
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
          {["subscriptions \u2014 plan, status, Stripe IDs, billing periods",
            "invoices \u2014 line items, amounts, payment status",
            "payments \u2014 Stripe payment intents, method, failure tracking",
            "ledger_entries \u2014 QuickBooks bridge (revenue/refund/fee/payout)",
          ].map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
              fontSize: "13px", color: COLORS.textDim,
            }}>
              <span style={{ color: COLORS.green }}>{"\u2713"}</span> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
