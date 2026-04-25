# PadMagnet admin web tests (Playwright)

Read-only smoke harness for the admin dashboard at `padmagnet.com/admin`.
Designed to be safe to run against the production admin without
mutating any listing or sending any email.

If you ever add tests that DO mutate (approve a listing, send-back to a
real owner, edit fields), put them in a separate `tests-admin/mutating/`
directory, gate them behind a `MUTATING_OK=1` env var, and only run
against a staging environment.

## One-time setup

1. Install browsers (already done if `npm install` ran with the dev
   dependency in place):
   ```
   npx playwright install chromium
   ```

2. Set your admin password in `.env.local` (gitignored):
   ```
   ADMIN_TEST_EMAIL=cmlundstrom@gmail.com           # optional, defaults to this
   ADMIN_TEST_PASSWORD_PLAYWRIGHT=your-real-admin-password
   ```
   (legacy `ADMIN_TEST_PASSWORD` also accepted as a fallback)

3. (Optional) Point at a non-default base URL:
   ```
   PADMAGNET_BASE_URL=https://padmagnet.com   # defaults to http://localhost:3000
   ```

## Running

```
# Headless against the configured base URL
npm run test:admin

# Visible browser, useful for debugging selectors
npm run test:admin:headed

# Interactive Playwright UI (best for writing new tests)
npm run test:admin:ui
```

## Layout

- `global.setup.js` — logs in once, captures cookies into `.auth/admin.json`.
  Every other test reuses that storage state.
- `smoke/admin_listings_panel.spec.js` — stat cards, default Pending Review
  filter, search field accepts input.
- `smoke/admin_review_actions.spec.js` — pending-row expand renders all
  five action buttons; Send Back modal opens and cancels cleanly.
- `smoke/admin_edit_page.spec.js` — `/admin/listings/{id}/edit` renders
  with the admin warning banner + form sections + correct action labels.

## Why no full mutation tests?

These would either mutate prod data (bad) or require a dedicated staging
environment (not yet set up). Manual mutation testing is currently the
expected path for Approve / Send Back / Admin Edit. Once we have a
staging branch on Vercel + a seedable test DB, we can add a
`mutating/` suite that performs the full happy paths.
