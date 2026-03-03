/**
 * Core match checker for boosted listings.
 * A boosted listing is only promoted if it matches ALL core fields
 * toggled in listing_field_configs (is_core_match_field = true).
 */

const MATCHERS = {
  list_price: (l, p) => !p.budget_max || l.list_price <= p.budget_max,
  bedrooms_total: (l, p) => !p.beds_min || l.bedrooms_total >= p.beds_min,
  bathrooms_total: (l, p) => !p.baths_min || l.bathrooms_total >= p.baths_min,
  city: (l, p) => !p.preferred_cities?.length || p.preferred_cities.includes(l.city),
  pets_allowed: (l, p) => !p.pets_required || l.pets_allowed !== false,
  property_sub_type: (l, p) => !p.property_types?.length || p.property_types.includes(l.property_sub_type),
};

export function matchesCoreFields(listing, prefs, coreFieldRows) {
  if (!prefs) return true;
  return coreFieldRows.every(({ field_key }) => {
    const matcher = MATCHERS[field_key];
    return !matcher || matcher(listing, prefs);
  });
}
