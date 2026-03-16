// Tier definitions — single source of truth for feature gating
// Used by useSubscription hook and all tier-aware components
export const TIERS = {
  free: {
    key: 'free',
    label: 'Starter',
    maxListings: 1,
    price: { monthly: 0, annual: 0 },
    features: [
      '1 active listing',
      'Full 8-step listing wizard',
      'Up to 10 photos',
      'Nearby Rentals pricing tool',
      'Tenant matching via PadScore',
      'In-app messaging',
      'Email + push notifications',
      'Basic listing stats',
    ],
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    maxListings: 5,
    price: { monthly: 499, annual: 3990 }, // cents
    badge: 'verified',
    features: [
      'Up to 5 active listings',
      'Verified Owner badge',
      'Listing analytics dashboard',
      'Price drop auto-push',
      'Priority placement',
      'Listing renewal reminders',
      'SMS inquiry alerts',
    ],
  },
  premium: {
    key: 'premium',
    label: 'Premium',
    maxListings: 999,
    price: { monthly: 999, annual: 7990 }, // cents
    badge: 'featured',
    features: [
      'Unlimited active listings',
      'Featured gold badge',
      'Instant push to matched tenants',
      'Lead contact export (CSV)',
      'Custom branding on listings',
      'Priority support',
      'Competitive insights',
    ],
  },
};

// Feature flags derived from tier
export function getTierFeatures(tier = 'free') {
  const t = TIERS[tier] || TIERS.free;
  return {
    maxListings: t.maxListings,
    canViewAnalytics: tier !== 'free',
    canExportLeads: tier === 'premium',
    canCustomBrand: tier === 'premium',
    canInstantPush: tier === 'premium',
    hasBadge: tier !== 'free',
    badgeType: tier === 'premium' ? 'featured' : tier === 'pro' ? 'verified' : null,
    hasSmsAlerts: tier !== 'free',
    hasPriorityPlacement: tier !== 'free',
  };
}
