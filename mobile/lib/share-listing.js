import { Share } from 'react-native';
import { apiFetch } from './api';

// Cache the template so we don't fetch on every share tap
let cachedTemplate = null;

async function getTemplate() {
  if (cachedTemplate) return cachedTemplate;
  try {
    const data = await apiFetch('/api/templates/share');
    cachedTemplate = data;
    // Expire cache after 5 min
    setTimeout(() => { cachedTemplate = null; }, 5 * 60 * 1000);
    return data;
  } catch (e) {
    return {
      subject: 'Check out this rental: {{address}}, {{city}} — {{price}}',
      body: 'Check out this rental on PadMagnet! {{address}}, {{city}} — {{price}}\nhttps://padmagnet.com/listing/{{id}}',
    };
  }
}

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

/**
 * Share a listing using the admin-configured share template.
 * Works from any screen — listing detail, owner preview, analytics.
 */
export async function shareListing(listing) {
  if (!listing) return;

  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const price = listing.list_price ? `$${Number(listing.list_price).toLocaleString()}/mo` : '';
  const vars = { address, city: listing.city || '', price, id: listing.id };

  const template = await getTemplate();

  try {
    await Share.share({
      title: `Rental in ${listing.city || 'South Florida'} — ${price} | PadMagnet`,
      subject: fill(template.subject, vars),
      message: fill(template.body, vars),
    });
  } catch (e) {
    // User cancelled
  }
}
