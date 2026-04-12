import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from './supabase';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Require admin or super_admin role for an API route.
 * Supports both:
 *   - Bearer token auth (mobile app / API clients)
 *   - Cookie-based auth (admin dashboard browser sessions)
 *
 * Returns { user, profile, supabase } on success, or a NextResponse error.
 *
 * Usage:
 *   const auth = await requireAdmin(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { user, profile, supabase } = auth;
 */
export async function requireAdmin(request) {
  let user = null;

  // Try 1: Bearer token (mobile / API clients)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await anonClient.auth.getUser(token);
    if (!error && data?.user) {
      user = data.user;
    }
  }

  // Try 2: Cookie-based session (admin dashboard browser)
  if (!user) {
    try {
      const cookieStore = await cookies();
      const supabaseCookie = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      });
      const { data: { user: cookieUser } } = await supabaseCookie.auth.getUser();
      if (cookieUser) {
        user = cookieUser;
      }
    } catch {
      // cookies() not available — not a browser request
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify admin role
  const supabase = createServiceClient();
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 401 });
  }

  if (!['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user, profile, supabase };
}
