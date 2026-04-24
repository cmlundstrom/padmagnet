// Module-level cache for owner listings. Populated by the Listings tab on
// fetch; consumed by Edit Listing so it can hydrate immediately instead of
// blocking on its own GET. Stale-while-revalidate pattern: consumers render
// cached data, then fire a background refresh.
//
// Not a general-purpose cache — only used for listing rows keyed by id.

const cache = new Map();

export function getCachedListing(id) {
  if (!id) return null;
  return cache.get(id) || null;
}

export function setCachedListing(listing) {
  if (!listing?.id) return;
  cache.set(listing.id, listing);
}

export function setCachedListings(listings) {
  if (!Array.isArray(listings)) return;
  for (const l of listings) {
    if (l?.id) cache.set(l.id, l);
  }
}

export function invalidateListing(id) {
  if (id) cache.delete(id);
}

export function clearCache() {
  cache.clear();
}
