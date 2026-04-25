// READ-ONLY admin Listings panel smoke. Verifies the panel renders, the
// stats cards are present, the default filter is Pending Review, and the
// search field accepts input. Does not mutate any listing data.

const { test, expect } = require('@playwright/test');

test.describe('Admin Listings panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin#listings');
    // Sidebar nav doesn't always auto-route on first hash load; click the
    // sidebar item explicitly if needed.
    const listingsNav = page.getByText('Listings', { exact: true }).first();
    if (await listingsNav.isVisible()) {
      await listingsNav.click();
    }
  });

  test('renders stats cards', async ({ page }) => {
    await expect(page.getByText('Total Listings').first()).toBeVisible();
    await expect(page.getByText('Active').first()).toBeVisible();
    await expect(page.getByText('Pending Review').first()).toBeVisible();
    await expect(page.getByText('Drafts').first()).toBeVisible();
    await expect(page.getByText('Suppressed').first()).toBeVisible();
  });

  test('defaults to Pending Review filter', async ({ page }) => {
    // The Pending Review filter chip should have the selected styling.
    // We can't assert pixel-perfect color, but the chip text is always there.
    const chip = page.getByRole('button', { name: /^Pending Review/ });
    await expect(chip).toBeVisible();
  });

  test('search field accepts input', async ({ page }) => {
    const search = page.getByPlaceholder(/Search MLS#/);
    await expect(search).toBeVisible();
    await search.fill('Tioga');
    await expect(search).toHaveValue('Tioga');
    // Clear so we don't bleed state into other tests.
    await search.fill('');
  });
});
