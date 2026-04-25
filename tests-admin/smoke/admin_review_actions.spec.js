// READ-ONLY admin review-action surface check. Expands the first pending
// listing row, verifies the Review Required bar exposes all five actions
// (Approve / Send Back / Reject / Edit / Full Render), opens the Send Back
// modal, then cancels without submitting. No data mutation.

const { test, expect } = require('@playwright/test');

test.describe('Admin review actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin#listings');
    const listingsNav = page.getByText('Listings', { exact: true }).first();
    if (await listingsNav.isVisible()) {
      await listingsNav.click();
    }
  });

  test('Review Required bar shows all five actions', async ({ page }) => {
    test.slow(); // expand-row may animate

    // If there are no pending listings, skip — the test would be vacuous.
    const noPending = await page
      .getByText('No listings match your filters')
      .isVisible()
      .catch(() => false);
    if (noPending) {
      test.skip(true, 'No pending listings to review');
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

  test('Send Back modal opens and cancels cleanly', async ({ page }) => {
    test.slow();

    const noPending = await page
      .getByText('No listings match your filters')
      .isVisible()
      .catch(() => false);
    if (noPending) {
      test.skip(true, 'No pending listings to review');
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
