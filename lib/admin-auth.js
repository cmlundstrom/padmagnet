import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from './supabase';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Require admin or super_admin role for an API route.
 * Returns { user, profile, supabase } on success, or a NextResponse error.
 *
 * Usage:
 *   const auth = await requireAdmin(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { user, profile, supabase } = auth;
 */
export async function requireAdmin(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await anonClient.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

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
