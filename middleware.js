// PADMAGNET SHUTDOWN SHUTTER — 2026-07-22
// Intercepts every request: pages get a 410 "closed" notice, API routes get 410 JSON.
// X-Robots-Tag + public/robots.txt handle deindexing. The full app is preserved
// untouched behind this file — to revive, see git tag archive/2026-07-22-last-live-app.
import { NextResponse } from 'next/server';

const SHUTTER_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>PadMagnet — Closed</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #1a1a2e; color: #eaeaea; font-family: system-ui, -apple-system, sans-serif; }
  main { text-align: center; padding: 2rem; max-width: 26rem; }
  h1 { font-size: 1.6rem; margin: 0 0 .75rem; }
  p { line-height: 1.5; color: #b8b8c8; margin: .5rem 0; }
  .magnet { font-size: 2.5rem; margin-bottom: 1rem; }
</style>
</head>
<body>
<main>
  <div class="magnet">🧲</div>
  <h1>PadMagnet has closed.</h1>
  <p>Thanks to everyone who swiped, listed, and tested with us.</p>
  <p>Questions? <a href="mailto:hello@padmagnet.com" style="color:#8ab4f8">hello@padmagnet.com</a></p>
</main>
</body>
</html>`;

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'PadMagnet has shut down. This API is no longer in service.' },
      { status: 410, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
    );
  }

  return new NextResponse(SHUTTER_HTML, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// Everything except robots.txt (crawlers must be able to read the disallow).
export const config = {
  matcher: ['/((?!robots.txt).*)'],
};
