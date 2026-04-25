// Playwright config for the PadMagnet web admin (and other internal web
// surfaces). Mobile app testing is covered by Maestro under mobile/.maestro/.
//
// Run modes:
//   npm run test:admin           — headless against PADMAGNET_BASE_URL
//                                   (defaults to http://localhost:3000)
//   npm run test:admin:headed    — visible browser, useful for debugging
//   npm run test:admin:ui        — Playwright's visual UI runner
//
// IMPORTANT: tests in tests-admin/smoke/ are READ-ONLY. They observe the
// admin surface without mutating data. Do not add tests that approve,
// send-back, or edit real listings unless you target a dedicated staging
// environment.

const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.PADMAGNET_BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: './tests-admin',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // admin shares a session — keep deterministic
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // shared admin session
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    // Shared defaults for ALL projects. storageState is intentionally NOT
    // here — the setup project must run without it (it's the producer of
    // that file), and only the test project should consume it.
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'admin-setup',
      testMatch: /global\.setup\.js/,
      // No storageState — this project CREATES it.
    },
    {
      name: 'admin-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-admin/.auth/admin.json',
      },
      dependencies: ['admin-setup'],
    },
  ],
});
