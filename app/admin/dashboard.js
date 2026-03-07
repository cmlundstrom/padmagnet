'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "../../lib/supabase-browser";
import { COLORS, baseButton, Badge } from "./shared";

// Panels
import OverviewPanel from "./panels/OverviewPanel";
import FeedsPanel from "./panels/FeedsPanel";
import PadScorePanel from "./panels/PadScorePanel";
import ListingsPanel from "./panels/ListingsPanel";
import SupportPanel from "./panels/SupportPanel";
import WaitlistPanel from "./panels/WaitlistPanel";
import ProductsPanel from "./panels/ProductsPanel";
import BillingPanel from "./panels/BillingPanel";
import UsersPanel from "./panels/UsersPanel";
import AuditLogPanel from "./panels/AuditLogPanel";
import BacklogPanel from "./panels/BacklogPanel";
import DisplayFieldsPanel from "./panels/DisplayFieldsPanel";

// ============================================================
// MAIN DASHBOARD
// ============================================================
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "waitlist", label: "Waitlist", icon: "📧" },
  { id: "feeds", label: "IDX Feeds", icon: "🔌" },
  { id: "padscore", label: "PadScore", icon: "🎯" },
  { id: "listings", label: "Listings", icon: "🏠" },
  { id: "display-fields", label: "Display Fields", icon: "🔧" },
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
  const [adminName, setAdminName] = useState("");
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
    const interval = setInterval(refreshTicketCount, 60000);
    return () => clearInterval(interval);
  }, [refreshTicketCount]);

  // Fetch admin user display name
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata;
      const email = data?.user?.email || "";
      setAdminName(meta?.full_name || meta?.name || email.split("@")[0]);
    });
  }, []);

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
    "display-fields": <DisplayFieldsPanel />,
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
            if (item.id === "backlog") return null;
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

        {/* Backlog — separated from main nav */}
        <div style={{ padding: "0 8px 8px" }}>
          <div onClick={() => setActiveTab("backlog")} style={{
            borderRadius: "8px", cursor: "pointer",
            padding: "2px",
            background: activeTab === "backlog"
              ? "linear-gradient(135deg, #f59e0b, #ef4444, #a855f7, #3b82f6, #22d3ee)"
              : "linear-gradient(135deg, #f59e0b, #ef4444, #a855f7, #3b82f6)",
            backgroundSize: "300% 300%",
            animation: "backlog-glow 3s ease infinite",
            boxShadow: activeTab === "backlog"
              ? "0 0 20px rgba(168,85,247,0.5), 0 0 40px rgba(239,68,68,0.3)"
              : "0 0 12px rgba(168,85,247,0.3), 0 0 24px rgba(239,68,68,0.15)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: sidebarCollapsed ? "10px 0" : "10px 12px",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              borderRadius: "6px",
              background: activeTab === "backlog" ? "rgba(10,14,23,0.85)" : "rgba(10,14,23,0.92)",
              color: activeTab === "backlog" ? "#fff" : "#e2e8f0",
              fontWeight: 800,
              fontSize: "14px",
              letterSpacing: "0.02em",
            }}>
              <span style={{ fontSize: "18px", width: 24, textAlign: "center", animation: "backlog-bounce 2s ease-in-out infinite" }}>📋</span>
              {!sidebarCollapsed && (
                <span style={{
                  background: "linear-gradient(90deg, #f59e0b, #ef4444, #a855f7, #22d3ee)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "backlog-text 4s linear infinite",
                }}>
                  Backlog
                </span>
              )}
            </div>
            <style>{`
              @keyframes backlog-glow {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }
              @keyframes backlog-bounce {
                0%, 100% { transform: scale(1) rotate(0deg); }
                25% { transform: scale(1.2) rotate(-8deg); }
                50% { transform: scale(1) rotate(0deg); }
                75% { transform: scale(1.2) rotate(8deg); }
              }
              @keyframes backlog-text {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
              }
            `}</style>
          </div>
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
          {adminName && (
            <div style={{
              display: "inline-flex", alignItems: "center", padding: "4px 14px",
              borderRadius: "20px",
              background: `linear-gradient(135deg, ${COLORS.brand}, ${COLORS.purple})`,
              fontSize: "13px", fontWeight: 700, color: "#000",
              letterSpacing: "-0.01em",
            }}>
              {adminName}
            </div>
          )}
        </div>

        {/* Panel Content */}
        <div style={{ padding: "24px 28px" }}>
          {panels[activeTab]}
        </div>
      </div>
    </div>
  );
}
