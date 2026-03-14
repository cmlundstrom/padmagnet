/**
 * SMS Consent Management
 *
 * Records or revokes the user's consent to receive SMS notifications.
 * Stores consent timestamp and IP for TCPA compliance.
 */

import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { consent, phone } = await request.json();

    if (typeof consent !== 'boolean') {
      return NextResponse.json({ error: 'consent must be a boolean' }, { status: 400 });
    }

    // If granting consent, phone number is required
    if (consent && !phone) {
      return NextResponse.json({ error: 'phone is required when granting consent' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get client IP for TCPA compliance logging
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    const update = {
      sms_consent: consent,
      sms_consent_at: new Date().toISOString(),
      sms_consent_ip: ip,
    };

    // Update phone + set preferred_channel to sms when granting consent
    if (consent) {
      update.phone = phone;
      update.preferred_channel = 'sms';
    }

    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
