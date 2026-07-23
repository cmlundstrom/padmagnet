# PadMagnet

> **⚰️ SHUT DOWN 2026-07-22 — this repo is an ARCHIVE.** The app no longer serves:
> padmagnet.com shows a 410 shutter, the Play listing is unpublished, and every external
> service (Supabase, Stripe, Twilio, Resend, xAI, GCP, Workspace) is dead or dormant.
> **Read `docs/PADMAGNET_SHUTDOWN_RUNBOOK.md` first** — it records every service's end-state
> and the revival map. Revival point = git tag `archive/2026-07-22-last-live-app` +
> `archive/supabase-final-2026-07-22/` (final DB dump + photos + restore README).
> Everything below describes the app as it was when live.

Swipe-style rental matching for renters and owners.

## Project Structure

```
padmagnet/
├── app/
│   ├── layout.js          # Root layout (fonts, metadata)
│   ├── globals.css         # Global styles + slider styling
│   ├── page.js             # Landing page (Google Play install + App Store coming-soon)
│   └── admin/
│       ├── page.js         # Admin route entry
│       └── dashboard.js    # Full admin dashboard component
├── lib/
│   └── supabase.js         # Supabase client (anon + service role)
├── public/
│   └── images/             # Static assets (copy your existing images here)
├── .env.local.example      # Environment variable template
├── .gitignore
├── next.config.js
└── package.json
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
```
Edit `.env.local` with your Supabase keys from:
**Supabase Dashboard → Settings → API**

### 3. Run locally
```bash
npm run dev
```
- Landing page: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin

### 4. Deploy to Vercel
Push to your GitHub repo. Vercel auto-deploys.

**Important:** Add these environment variables in Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with Google Play install CTA + App Store coming-soon |
| `/admin` | Admin dashboard (IDX feeds, PadScore config, listings, support, billing) |

## Migrating Your Landing Page

The current `app/page.js` is a functional replacement for your static `index.html`.
If you want to restore your exact original design, upload your `index.html` to Claude
and ask: "Convert this HTML landing page to a Next.js React component."

Your existing `/images/` folder should be copied to `/public/images/`.
