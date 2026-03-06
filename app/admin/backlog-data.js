// ╔══════════════════════════════════════════════════════════════════╗
// ║  PADMAGNET PROJECT BACKLOG                                      ║
// ║                                                                 ║
// ║  Single source of truth for project tasks.                      ║
// ║  Claude updates this file after each session.                   ║
// ║  Status: done | in-progress | pending | blocked | deferred      ║
// ╚══════════════════════════════════════════════════════════════════╝

export const BACKLOG = [
  {
    category: "Completed — Foundation & Core",
    items: [
      { id: "T01", title: "Run migrations 009-020 (landlord workflow, billing, storage, etc.)", status: "done", date: "2026-03-03" },
      { id: "PM-09", title: "Google Geocoding key configured", status: "done", date: "2026-03-03" },
      { id: "PM-10", title: "Photo upload to Supabase Storage", status: "done", date: "2026-03-03" },
      { id: "PM-11", title: "PadScore lease_too_short check (server + client)", status: "done", date: "2026-03-03" },
      { id: "PM-12", title: "Stripe API routes (checkout, webhook, renew) — code written, not wired", status: "done", date: "2026-03-03" },
      { id: "PM-13", title: "Cron jobs: listing expiration + expiry emails", status: "done", date: "2026-03-03" },
      { id: "PM-14", title: "Mobile owner create flow (8-step wizard)", status: "done", date: "2026-03-03" },
      { id: "PM-15", title: "Mobile listing preview + relist screens", status: "done", date: "2026-03-03" },
      { id: "PM-16", title: "Auth flow workarounds for Expo Go (magic link, deep links)", status: "done", date: "2026-03-03" },
      { id: "PM-17", title: "SMTP fix (Resend key rotation in Supabase Auth)", status: "done", date: "2026-03-03" },
      { id: "PM-18", title: "Design system unification (AuthHeader, app-theme.css, COLORS)", status: "done", date: "2026-03-02" },
    ],
  },
  {
    category: "Completed — Recent Sessions",
    items: [
      { id: "PM-01", title: "Product display flow — API, hook, ProductCard, Services screen", status: "done", date: "2026-03-04" },
      { id: "PM-02", title: "Fix product data freshness (Next.js fetch cache + no-store)", status: "done", date: "2026-03-04" },
      { id: "PM-03", title: "Supabase Realtime on products table", status: "done", date: "2026-03-04" },
      { id: "PM-04", title: "Products admin panel — audience split, hard delete, inline edit", status: "done", date: "2026-03-03" },
      { id: "PM-05", title: "Admin dashboard — standardize Listings + Audit panels to AdminTable", status: "done", date: "2026-03-03" },
      { id: "PM-06", title: "Owner tab reorder (Listings > Services > Messages > Profile)", status: "done", date: "2026-03-04" },
      { id: "PM-07", title: "Dashboard: Wired to App column, Last Modified column, updated_at trigger", status: "done", date: "2026-03-04" },
      { id: "PM-08", title: "Mobile \\n line break rendering in ProductCard", status: "done", date: "2026-03-04" },
      { id: "PM-19", title: "Backlog dashboard panel (data file + UI + animated sidebar button)", status: "done", date: "2026-03-04" },
      { id: "PM-20", title: "Fix profiles.role default from admin to tenant", status: "done", date: "2026-03-04" },
      { id: "PM-21", title: "Fix test user roles (info@ → tenant, maintenance@ → owner)", status: "done", date: "2026-03-04" },
      { id: "PM-22", title: "Admin login: forgot password flow (implicit auth, Resend email)", status: "done", date: "2026-03-04" },
      { id: "PM-23", title: "Admin password reset via Management API", status: "done", date: "2026-03-04" },
      { id: "PM-24", title: "Role-gated admin middleware (profiles.role check)", status: "done", date: "2026-03-04" },
      { id: "PM-25", title: "Fix PKCE recovery flow (server-side code exchange + implicit fallback)", status: "done", date: "2026-03-04" },
      { id: "PM-26", title: "Waitlist role label landlord → owner (DB + landing page)", status: "done", date: "2026-03-04" },
      { id: "PM-27", title: "Delete orphaned chris@floridapm.net (auth + waitlist)", status: "done", date: "2026-03-04" },
      { id: "PM-28", title: "Replace geocode API with local service-area autocomplete in ZonePicker", status: "done", date: "2026-03-05", notes: "Static city/zip data for 5 counties, local filtering, no API calls" },
      { id: "PM-29", title: "Require at least 1 zone in onboarding step 2", status: "done", date: "2026-03-05" },
      { id: "PM-30", title: "Onboarding overhaul: back pill, bigger logo, new copy, remove skip", status: "done", date: "2026-03-05" },
      { id: "PM-31", title: "Onboarding step resumption (persists to AsyncStorage)", status: "done", date: "2026-03-05" },
      { id: "PM-32", title: "Fix VirtualizedList nesting error in ZonePicker", status: "done", date: "2026-03-05" },
      { id: "PM-33", title: "Fix keyboard covering zone search on onboarding step 2", status: "done", date: "2026-03-05" },
      { id: "PM-34", title: "Property type onboarding step (7 types, chip selectors, PadScore integration)", status: "done", date: "2026-03-05" },
      { id: "PM-35", title: "Text-based logo on welcome screen (white Pad + orange Magnet)", status: "done", date: "2026-03-05" },
      { id: "PM-36", title: "Back pill moved to upper-left + Back text link restored on all steps", status: "done", date: "2026-03-05" },
      { id: "PM-37", title: "Profile button renamed to PadScore™ Preferences", status: "done", date: "2026-03-05" },
      { id: "PM-38", title: "Property types list synced across onboarding, preferences, owner create", status: "done", date: "2026-03-05" },
      { id: "PM-39", title: "Remove Min Budget, Min Lease, Max HOA from tenant preferences UI", status: "done", date: "2026-03-05", notes: "DB columns kept, just hidden from UI" },
      { id: "PM-40", title: "Add association_preferred column + Association chip selector in preferences", status: "done", date: "2026-03-05", notes: "NULL=no pref, true=prefer, false=avoid; 50pt PadScore penalty on mismatch" },
      { id: "PM-41", title: "Replace hoa_mismatch with association_mismatch in PadScore (server+client+admin)", status: "done", date: "2026-03-05", notes: "Uses hoa_fee > 0 as proxy for association until AssociationYN from Bridge" },
      { id: "PM-42", title: "Update preferences footer text + location label", status: "done", date: "2026-03-05" },
    ],
  },
  {
    category: "Ready to Build — Admin Dashboard",
    items: [
      { id: "T02", title: "Extract AdminLayout shell from monolith", status: "done", date: "2026-03-04", notes: "dashboard.js → shell (277 lines) + shared.js + demo-data.js" },
      { id: "T03", title: "Extract panels into separate files under panels/", status: "done", date: "2026-03-04", notes: "11 panel files in app/admin/panels/, zero behavior changes" },
      { id: "T04", title: "Wire Overview panel to real Supabase data", status: "pending", notes: "Replace DEMO_* with real listing counts, sync status, KPIs" },
      { id: "T05", title: "Wire Feeds panel to real sync_logs data", status: "pending", notes: "sync_logs table exists, UI still hardcoded" },
      { id: "T06", title: "Wire Listings panel to real data", status: "pending", notes: "Admin listings API exists, panel needs rewiring" },
      { id: "T07", title: "Wire PadScore panel to Supabase", status: "pending", notes: "padscore_configs table exists, need API + wire save" },
      { id: "T08", title: "Wire Billing panel to real data", status: "pending", notes: "Billing tables exist, panel is stub" },
      { id: "T-WL", title: "Wire Waitlist panel to real data", status: "pending", notes: "Still using DEMO data" },
      { id: "T-SM", title: "Splash message system (site_config table + Overview card + mobile display)", status: "pending", notes: "Admin-editable message on owner/tenant empty states" },
      { id: "T-RL", title: "Enable RLS on profiles table", status: "pending", notes: "Users read own row, admins read all" },
      { id: "T-UR", title: "Unify role source of truth (profiles.role for all users)", status: "pending", notes: "Mobile currently reads user_metadata.role — needs migration to profiles" },
    ],
  },
  {
    category: "Ready to Build — Mobile App",
    items: [
      { id: "T-ME", title: "Mobile listing edit screen", status: "pending", notes: "PUT API exists, no mobile UI yet" },
      { id: "T21", title: "Boost indicator badge on swipe cards", status: "pending", notes: "Subtle \"Boosted\" badge on boosted listings" },
    ],
  },
  {
    category: "Phase 2 — Owner Web Dashboard (/dashboard)",
    items: [
      { id: "T09", title: "Owner dashboard shell at /dashboard", status: "pending", notes: "Layout, auth, routes" },
      { id: "T10", title: "Owner listings management page", status: "pending", notes: "Web equivalent of mobile listings" },
      { id: "T11", title: "Owner listing detail with tabbed interface", status: "pending", notes: "Details, Calendar, Documents, Analytics tabs" },
      { id: "T12", title: "Calendar/availability/tour scheduling", status: "pending", notes: "DB tables exist, need API + UI" },
      { id: "T13", title: "Documents upload and send", status: "pending", notes: "DB table + storage bucket exist" },
      { id: "T15", title: "Email template editor (TipTap)", status: "pending", notes: "DB table exists" },
      { id: "T16", title: "Boost purchase flow for owners", status: "pending", notes: "Owner-facing boost API" },
      { id: "T18", title: "Owner analytics page", status: "pending", notes: "view_count works, need standalone page" },
    ],
  },
  {
    category: "Phase 3 — Mobile Polish",
    items: [
      { id: "T19", title: "Tenant tour request UI", status: "pending", notes: "Request Tour button + time slot picker" },
      { id: "T20", title: "Document viewer", status: "pending", notes: "PDF viewing + viewed_at tracking" },
      { id: "T22", title: "Owner billing screen", status: "pending", notes: "Wire up to purchase history + Stripe portal" },
      { id: "T23", title: "Multichannel message indicators", status: "pending", notes: "SMS/email/in-app channel icons" },
    ],
  },
  {
    category: "Blocked / Deferred",
    items: [
      { id: "T14", title: "Twilio multichannel messaging", status: "blocked", notes: "Twilio account setup required" },
      { id: "T17", title: "Owner billing UI (Stripe)", status: "blocked", notes: "Corporate entity + banking required" },
      { id: "T-ST", title: "Stripe activation (all payment flows)", status: "blocked", notes: "Corporate entity + banking required" },
      { id: "T-BR", title: "Bridge IDX sync", status: "blocked", notes: "IDX feed approval pending" },
      { id: "T-EA", title: "EAS production build", status: "deferred", notes: "After core features stable" },
      { id: "T-AS", title: "App Store / Play Store submission", status: "deferred", notes: "After EAS build" },
      { id: "T-AP", title: "Revisit tenant product app_path values", status: "deferred", notes: "After tenant pages defined" },
      { id: "T-GM", title: "Google Maps Android app restriction", status: "deferred", notes: "After first EAS build (needs SHA-1)" },
      { id: "T-GE", title: "Expand Bridge sync filter to full SE Florida coverage", status: "blocked", notes: "Currently hardcoded to 9 Treasure Coast cities — needs all Gold Coast cities when Bridge API access is live" },
      { id: "T-AY", title: "Add AssociationYN to Bridge sync for definitive association detection", status: "deferred", notes: "Currently using hoa_fee > 0 as proxy — add RESO field when Bridge access is live" },
    ],
  },
];
