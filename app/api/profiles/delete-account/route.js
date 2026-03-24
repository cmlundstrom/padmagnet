import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const rl = await checkRateLimit('default', user.id);
    if (rl.limited) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: rl.headers });
    }

    const supabase = createServiceClient();

    // Fetch profile to determine role, Stripe IDs, and tier
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role, stripe_customer_id, tier, tier_expires_at')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Block admin/super_admin self-deletion
    if (['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deleted through the app. Contact support.' },
        { status: 403 }
      );
    }

    // 1. Cancel active Stripe subscription/tier if exists
    if (profile.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        // List and cancel any active subscriptions
        const subs = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active',
        });
        for (const sub of subs.data) {
          await stripe.subscriptions.cancel(sub.id);
        }
      } catch (stripeErr) {
        console.error('Stripe cleanup error (continuing):', stripeErr.message);
      }
    }

    // 2. Deactivate all owner listings
    if (profile.role === 'owner') {
      await supabase
        .from('listings')
        .update({ status: 'archived', is_active: false })
        .eq('owner_user_id', user.id)
        .neq('status', 'archived');
    }

    // 3. Anonymize conversations — set user's column to NULL
    await supabase
      .from('conversations')
      .update({ tenant_user_id: null })
      .eq('tenant_user_id', user.id);

    await supabase
      .from('conversations')
      .update({ owner_user_id: null })
      .eq('owner_user_id', user.id);

    // 4. Anonymize messages — set sender_id to NULL
    await supabase
      .from('messages')
      .update({ sender_id: null })
      .eq('sender_id', user.id);

    // 5. Cancel pending deliveries
    await supabase
      .from('message_delivery_queue')
      .delete()
      .eq('recipient_id', user.id);

    // 6. Clean phone mappings
    await supabase
      .from('phone_mappings')
      .delete()
      .eq('user_id', user.id);

    // 7. Clean testimonials
    await supabase
      .from('testimonials')
      .delete()
      .eq('user_id', user.id);

    // 8. Delete storage files (listing photos)
    try {
      const { data: files } = await supabase.storage
        .from('listing-photos')
        .list(user.id);
      if (files?.length) {
        const paths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('listing-photos').remove(paths);
      }
    } catch (storageErr) {
      console.error('Storage cleanup error (continuing):', storageErr.message);
    }

    // 9. Log deletion to audit_log before deleting the user
    await supabase.from('audit_log').insert({
      action: 'account_deleted',
      admin_user: 'self',
      details: { user_id: user.id, role: profile.role, email: user.email },
    }).catch(() => {});

    // 10. Delete auth user — cascades to profiles, preferences, search_zones, swipes, listing_views
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error('Auth user deletion failed:', deleteErr.message);
      return NextResponse.json({ error: 'Account deletion failed. Please contact support.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
