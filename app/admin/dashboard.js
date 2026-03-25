'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "../../lib/supabase-browser";
import { COLORS, baseButton, Badge } from "./shared";

// Panels
import OverviewPanel from "./panels/OverviewPanel";
import PadScorePanel from "./panels/PadScorePanel";
import ListingsPanel from "./panels/ListingsPanel";
import SupportPanel from "./panels/SupportPanel";
import ProductsPanel from "./panels/ProductsPanel";
import UsersPanel from "./panels/UsersPanel";
import TenantsPanel from "./panels/TenantsPanel";
import OwnersPanel from "./panels/OwnersPanel";
import AuditLogPanel from "./panels/AuditLogPanel";
import DisplayFieldsPanel from "./panels/DisplayFieldsPanel";
import DisclaimersPanel from "./panels/DisclaimersPanel";
import MessagingPanel from "./panels/MessagingPanel";
import SystemHealthPanel from "./panels/SystemHealthPanel";
import TemplateEditorPanel from "./panels/TemplateEditorPanel";
import SalesPagesPanel from "./panels/SalesPagesPanel";

// ============================================================
// MAIN DASHBOARD
// ============================================================
const NAV_ITEMS = [
  { id: "overview", label: "Metrics & Overview", icon: "📊" },
  { id: "padscore", label: "PadScore", icon: "🎯" },
  { id: "listings", label: "Listings", icon: "🏠" },
  { id: "display-fields", label: "Display Fields", icon: "🔧" },
  { id: "disclaimers", label: "Disclaimers", icon: "⚖️" },
  { id: "support", label: "Support", icon: "💬" },
  { id: "messaging", label: "Messaging", icon: "📨" },
  { id: "system-health", label: "System Health", icon: "🔗" },
  { id: "templates", label: "Templates", icon: "📝" },
  { id: "sales-pages", label: "Sales Pages", icon: "📄" },
  { id: "products", label: "Revenue & Products", icon: "💰" },
  { id: "tenants", label: "Tenants", icon: "🏘️" },
  { id: "owners", label: "Owners", icon: "🔑" },
  { id: "users", label: "Administrators", icon: "🔐" },
  { id: "audit", label: "Audit Log", icon: "📝" },
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

  // Fetch admin display name from profiles table (single source of truth)
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', data.user.id)
        .single();
      setAdminName(profile?.display_name || data.user.email?.split("@")[0] || "");
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
    padscore: <PadScorePanel />,
    listings: <ListingsPanel />,
    "display-fields": <DisplayFieldsPanel />,
    disclaimers: <DisclaimersPanel />,
    support: <SupportPanel onTicketChange={refreshTicketCount} />,
    messaging: <MessagingPanel />,
    "system-health": <SystemHealthPanel />,
    templates: <TemplateEditorPanel />,
    "sales-pages": <SalesPagesPanel />,
    products: <ProductsPanel />,
    tenants: <TenantsPanel />,
    owners: <OwnersPanel />,
    users: <UsersPanel />,
    audit: <AuditLogPanel />,
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
            src="/logo/padmagnet-icon-120-dark.png"
            alt="PadMagnet"
            width={32}
            height={32}
            style={{ borderRadius: "8px", flexShrink: 0 }}
          />
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.02em" }}><span style={{ color: COLORS.text }}>Pad</span><span style={{ color: "#F95E0C" }}>Magnet</span></div>
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
