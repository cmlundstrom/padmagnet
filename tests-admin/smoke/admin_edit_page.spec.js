// READ-ONLY check that the admin inline-edit page loads for a real listing
// and surfaces the admin warning banner + the Save / Cancel actions. Does
// not save, so no data mutation occurs.

const { test, expect } = require('@playwright/test');

test('Admin edit page renders banner + form sections', async ({ page, request }) => {
  // Find any listing id to drive the edit route. Uses the admin listings
  // GET endpoint which we already exercise in the panel test.
  const res = await request.get('/api/admin/listings');
  expect(res.ok()).toBeTruthy();
  const listings = await res.json();
  expect(Array.isArray(listings)).toBeTruthy();

  // Prefer a pending listing if available so the test exercises the
  // "Save & Approve" headline; otherwise any owner listing works.
  const target =
    listings.find(l => l.status === 'pending_review') ||
    listings.find(l => l.source === 'owner');

  test.skip(!target, 'No suitable listing to drive edit page');

  await page.goto(`/admin/listings/${target.id}/edit`);

  // Admin warning banner.
  await expect(page.getByText(/Editing as admin/)).toBeVisible({ timeout: 10_000 });

  // Form section headings.
  await expect(page.getByRole('heading', { name: 'Address' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Property Details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Description' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible();

  // Action bar. The page has two "Back to Listings" buttons (top status
  // row uses "← Back to Listings", action bar uses bare "Back to Listings");
  // pin to the action-bar one with exact match.
  await expect(page.getByRole('button', { name: 'Back to Listings', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Save \(keep status\)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Save & (Approve|Re-Activate)/ })).toBeVisible();

  // Open Full Render link points at the admin-preview URL.
  const fullRender = page.getByRole('link', { name: /Full Render/ });
  await expect(fullRender).toBeVisible();
  await expect(fullRender).toHaveAttribute('href', new RegExp(`/listing/${target.id}\\?admin_preview=1`));
});
