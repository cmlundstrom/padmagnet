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
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: 'tests-admin/.auth/admin.json',
  },
  projects: [
    {
      name: 'admin-setup',
      testMatch: /global\.setup\.js/,
    },
    {
      name: 'admin-chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['admin-setup'],
    },
  ],
});
