// Demo data for admin dashboard panels (replace with Supabase queries)

export const DEMO_FEEDS = [
  { id: "f1", name: "BeachesMLS", provider_type: "rets", enabled: true, coverage_counties: ["Martin", "St. Lucie"], poll_interval_min: 60, last_sync_at: "2026-02-25T14:30:00Z", last_sync_status: "success", consecutive_failures: 0 },
  { id: "f2", name: "Manual Imports", provider_type: "manual", enabled: true, coverage_counties: ["Martin"], poll_interval_min: null, last_sync_at: "2026-02-24T09:00:00Z", last_sync_status: "success", consecutive_failures: 0 },
];

export const DEMO_SYNC_LOGS = [
  { id: "s1", feed_id: "f1", started_at: "2026-02-25T14:30:00Z", completed_at: "2026-02-25T14:31:12Z", status: "success", listings_added: 12, listings_updated: 47, listings_deactivated: 3, listings_skipped: 0, duration_ms: 72000 },
  { id: "s2", feed_id: "f1", started_at: "2026-02-25T13:30:00Z", completed_at: "2026-02-25T13:31:05Z", status: "success", listings_added: 4, listings_updated: 38, listings_deactivated: 1, listings_skipped: 2, duration_ms: 65000 },
  { id: "s3", feed_id: "f1", started_at: "2026-02-25T12:30:00Z", completed_at: "2026-02-25T12:30:45Z", status: "partial", listings_added: 8, listings_updated: 22, listings_deactivated: 0, listings_skipped: 5, duration_ms: 45000 },
];

export const DEMO_LISTINGS = [
  { id: "p1", mls_number: "RX-10998871", address_line1: "1425 SE Coral Reef St", city: "Stuart", state: "FL", zip: "34996", property_type: "sfh", rent_amount: 2800, beds: 3, baths: 2, sqft: 1650, display_status: "active", quality_score: 88, days_on_market: 5, pet_policy: "allowed", fenced_yard: true, list_date: "2026-02-20" },
  { id: "p2", mls_number: "RX-10998455", address_line1: "800 S Ocean Blvd #402", city: "Jensen Beach", state: "FL", zip: "34957", property_type: "apartment", rent_amount: 2200, beds: 2, baths: 2, sqft: 1100, display_status: "active", quality_score: 72, days_on_market: 22, pet_policy: "not_allowed", fenced_yard: false, list_date: "2026-02-03" },
  { id: "p3", mls_number: "RX-10997102", address_line1: "3380 NW Everglades Blvd", city: "Port St. Lucie", state: "FL", zip: "34983", property_type: "duplex_plus", rent_amount: 1900, beds: 2, baths: 1.5, sqft: 950, display_status: "review", quality_score: 45, days_on_market: 68, pet_policy: "unknown", fenced_yard: false, list_date: "2025-12-19" },
  { id: "p4", mls_number: "RX-10996889", address_line1: "221 SW Palm City Rd", city: "Stuart", state: "FL", zip: "34994", property_type: "sfh", rent_amount: 3500, beds: 4, baths: 3, sqft: 2400, display_status: "active", quality_score: 95, days_on_market: 2, pet_policy: "allowed", fenced_yard: true, list_date: "2026-02-23" },
  { id: "p5", mls_number: "RX-10995500", address_line1: "777 NE Dixie Hwy", city: "Stuart", state: "FL", zip: "34994", property_type: "apartment", rent_amount: 1500, beds: 1, baths: 1, sqft: 650, display_status: "suppressed", quality_score: 28, days_on_market: 95, pet_policy: "not_allowed", fenced_yard: false, list_date: "2025-11-22", suppressed_reason: "Photos missing, stale listing" },
];
