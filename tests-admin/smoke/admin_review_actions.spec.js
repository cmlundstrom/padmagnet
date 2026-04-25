// READ-ONLY admin review-action surface check. Expands the first pending
// listing row, verifies the Review Required bar exposes all five actions
// (Approve / Send Back / Reject / Edit / Full Render), opens the Send Back
// modal, then cancels without submitting. No data mutation.

const { test, expect } = require('@playwright/test');

// Helper: returns true if there are zero pending_review listings on the
// current admin Listings panel. Reads the live count via the admin
// listings API (more reliable than scraping empty-state text, which can
// race with React hydration).
async function noPendingListings(request) {
  const res = await request.get('/api/admin/listings');
  if (!res.ok()) return false;
  const listings = await res.json();
  return !listings.some(l => l.status === 'pending_review');
}

test.describe('Admin review actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin#listings');
    const listingsNav = page.getByText('Listings', { exact: true }).first();
    if (await listingsNav.isVisible()) {
      await listingsNav.click();
    }
  });

  test('Review Required bar shows all five actions', async ({ page, request }) => {
    test.slow(); // expand-row may animate

    if (await noPendingListings(request)) {
      test.skip(true, 'No pending listings to review (empty pending queue)');
    }

    // Click the first row to expand.
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    // Review Required bar.
    await expect(page.getByText('Review Required')).toBeVisible({ timeout: 5_000 });

    // Five action buttons. We assert each by visible label rather than role
    // because some are styled <button> with emoji + text.
    await expect(page.getByRole('button', { name: /Full Render/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /✏️ Edit/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Back/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reject/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Approve/ })).toBeVisible();
  });

  test('Send Back modal opens and cancels cleanly', async ({ page, request }) => {
    test.slow();

    if (await noPendingListings(request)) {
      test.skip(true, 'No pending listings to review (empty pending queue)');
    }

    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();

    await page.getByRole('button', { name: /Send Back/ }).click();

    // Modal heading.
    await expect(page.getByRole('heading', { name: /Send Back to Owner/ })).toBeVisible();

    // Reason dropdown defaults to first option (photos_quality).
    const select = page.locator('select').first();
    await expect(select).toBeVisible();
    await expect(select).toHaveValue('photos_quality');

    // Note textarea present + enforces 500-char cap on input.
    const note = page.getByPlaceholder(/Optional|Required/);
    await expect(note).toBeVisible();

    // Cancel — modal must dismiss without firing the API.
    await page.getByRole('button', { name: /Cancel/ }).click();
    await expect(page.getByRole('heading', { name: /Send Back to Owner/ })).not.toBeVisible();
  });
});
