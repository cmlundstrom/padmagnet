import { createServiceClient } from '../../../../../../lib/supabase';
import { getAuthUser } from '../../../../../../lib/auth-helpers';
import { sendTemplateEmail } from '../../../../../../lib/email';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://padmagnet.com';

// POST — generate a magic link for desktop photo upload and email it to the owner
export async function POST(request, { params }) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { id } = await params;
    const supabase = createServiceClient();

    // Verify ownership
    const { data: listing, error: fetchErr } = await supabase
      .from('listings')
      .select('id, owner_user_id, source, street_number, street_name, city, state_or_province')
      .eq('id', id)
      .single();

    if (fetchErr || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.source !== 'owner' || listing.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Generate magic link via Supabase Admin API
    const redirectTo = `${APP_URL}/upload-photos/${id}`;
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: { redirectTo },
    });

    if (linkError) {
      console.error('generateLink error:', linkError);
      return NextResponse.json({ error: 'Failed to generate upload link' }, { status: 500 });
    }

    // The generated link points to Supabase's verify endpoint.
    // We need to rewrite it to go through our auth callback so cookies are set server-side.
    const supabaseLink = new URL(linkData.properties.action_link);
    const token_hash = supabaseLink.searchParams.get('token_hash') || supabaseLink.searchParams.get('token');
    const type = supabaseLink.searchParams.get('type');

    // Build our callback URL that will exchange the token and redirect
    const callbackUrl = `${APP_URL}/auth/callback?token_hash=${token_hash}&type=${type}&next=${encodeURIComponent(`/upload-photos/${id}`)}`;

    // Build listing address for email
    const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
    const fullAddress = [address, listing.city, listing.state_or_province].filter(Boolean).join(', ');

    // Send branded email via Resend
    await sendTemplateEmail('photo_upload_link', user.email, {
      owner_name: user.user_metadata?.display_name || 'Property Owner',
      listing_address: fullAddress || 'your listing',
      upload_url: callbackUrl,
    });

    return NextResponse.json({ success: true, email: user.email });
  } catch (err) {
    console.error('Upload link error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
