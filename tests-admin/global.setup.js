// One-time admin login. Drives the real /admin/login UI via Supabase auth
// and saves the resulting cookie state for every other test to reuse via
// storageState. Avoids re-authing per test (slow + lockout risk).
//
// Required env (read from .env.local):
//   ADMIN_TEST_EMAIL     — defaults to cmlundstrom@gmail.com if unset
//   ADMIN_TEST_PASSWORD  — must be set; never commit
//
// Output:
//   tests-admin/.auth/admin.json   — Playwright storageState (cookies)

const { test: setup, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.ADMIN_TEST_EMAIL || 'cmlundstrom@gmail.com';
  const password = process.env.ADMIN_TEST_PASSWORD;

  if (!password) {
    throw new Error(
      'ADMIN_TEST_PASSWORD env var is required. Add it to .env.local (gitignored) ' +
        'or set in shell before running: export ADMIN_TEST_PASSWORD=…',
    );
  }

  // Ensure .auth directory exists.
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto('/admin/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForURL(/\/admin(\?|#|$)/, { timeout: 15_000 }),
    page.click('button[type="submit"]'),
  ]);

  // Sanity-check we're actually logged in.
  await expect(page).toHaveURL(/\/admin/);

  await page.context().storageState({ path: AUTH_FILE });
});
