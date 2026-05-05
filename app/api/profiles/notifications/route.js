/**
 * Notification Preferences
 *
 * Single endpoint for all notification-related profile writes:
 *   - SMS consent (sms_consent + sms_consent_at + sms_consent_ip,
 *     plus phone + preferred_channel='sms' when granting)
 *   - Preferred notification channel (preferred_channel)
 *
 * Replaces /api/profiles/sms-consent (renamed 2026-05-04 from a
 * misnomer — sms-consent only handled the SMS consent path; the
 * direct supabase.from('profiles').update({preferred_channel}) the
 * mobile client used to do for non-SMS channel changes was silently
 * blocked by RLS, so users saw "Saved" but the DB never updated.
 * This unified endpoint uses service-role and bypasses RLS for
 * every notification-prefs write.).
 *
 * Body (all optional, but at least one of {consent, preferred_channel}):
 *   - consent: boolean         — sms_consent toggle
 *   - phone: string (E164)     — required if consent=true
 *   - preferred_channel: 'in_app' | 'email' | 'sms'
 *
 * Behavior:
 *   - consent=true forces preferred_channel='sms' (turning SMS on
 *     also makes it the active channel; explicit preferred_channel
 *     in the same body is overridden).
 *   - consent=false does NOT clear phone (TCPA: keep phone on file
 *     for audit even after revocation; only sms_consent flips).
 *   - preferred_channel can be set independently when consent isn't
 *     in the body (the channel-only update path).
 *   - Welcome SMS still fires on opt-in (consent=true && phone).
 */

import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { sendSMS } from '../../../../lib/sms';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VALID_CHANNELS = ['in_app', 'email', 'sms'];

export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { consent, phone, preferred_channel } = await request.json();

    // Validate types when provided.
    if (consent !== undefined && typeof consent !== 'boolean') {
      return NextResponse.json({ error: 'consent must be a boolean if provided' }, { status: 400 });
    }
    if (preferred_channel !== undefined && !VALID_CHANNELS.includes(preferred_channel)) {
      return NextResponse.json(
        { error: 'preferred_channel must be in_app, email, or sms' },
        { status: 400 }
      );
    }

    // Must provide at least one update field.
    if (consent === undefined && preferred_channel === undefined) {
      return NextResponse.json(
        { error: 'must provide at least one of consent or preferred_channel' },
        { status: 400 }
      );
    }

    // If granting SMS consent, phone is required.
    if (consent === true && !phone) {
      return NextResponse.json({ error: 'phone is required when granting SMS consent' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Capture IP for TCPA compliance audit when consent is being touched.
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    const update = {};

    // SMS consent path.
    if (consent !== undefined) {
      update.sms_consent = consent;
      update.sms_consent_at = new Date().toISOString();
      update.sms_consent_ip = ip;
      if (consent === true) {
        update.phone = phone;
        // Turning SMS on also forces it as the active channel — any
        // preferred_channel value the caller sent in the same body
        // is overridden here intentionally.
        update.preferred_channel = 'sms';
      }
    }

    // Channel-only path (or alongside consent=false).
    // Skipped when consent=true because the block above already
    // forced preferred_channel='sms'.
    if (preferred_channel !== undefined && consent !== true) {
      update.preferred_channel = preferred_channel;
    }

    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // CTIA-required welcome SMS on opt-in.
    if (consent === true && phone) {
      sendSMS(phone, [
        'PadMagnet: You\'re now signed up for SMS notifications',
        '(inquiry alerts, listing reminders, messages).',
        'Msg frequency varies. Msg & data rates may apply.',
        'Reply HELP for help. Reply STOP to opt out.',
        'padmagnet.com/terms',
      ].join(' ')).catch(err => console.error('[SMS] Welcome SMS failed:', err.message));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
