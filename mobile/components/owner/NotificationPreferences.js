import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { NativeModules } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Toggle } from '../ui';
import { useAlert } from '../../providers/AlertProvider';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const hasNotifications = !!NativeModules.ExpoPushTokenManager;
const Notifications = hasNotifications ? require('expo-notifications') : null;

// ── Helpers ──────────────────────────────────────────────────

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function toE164(formatted) {
  const digits = formatted.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return formatted;
}

const CHANNELS = [
  { key: 'in_app', label: 'In-App Only', description: 'Notifications inside PadMagnet only' },
  { key: 'email', label: 'Email', description: 'Receive message alerts via email' },
  { key: 'sms', label: 'SMS', description: 'Receive message alerts via text message' },
];

// ── Component ────────────────────────────────────────────────

/**
 * Shared notification preferences component.
 *
 * Props:
 *   compact   — true for inline/embedded usage (toggles only, no header/save)
 *   context   — 'onboarding' | 'wizard' | 'messages' | 'settings'
 *   onSaved   — callback after a successful save
 *
 * Ref handle exposes:
 *   save()    — persist current state; returns true on success, false on error
 */
const NotificationPreferences = forwardRef(function NotificationPreferences(
  { compact = false, context = 'settings', onSaved },
  ref,
) {
  const { user } = useAuth();
  const alert = useAlert();

  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [phone, setPhone] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('in_app');

  // ── Load profile on mount ────────────────────────────────

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('phone, sms_consent, preferred_channel, expo_push_token')
          .eq('id', user.id)
          .single();

        if (cancelled) return;

        if (data) {
          setPhone(data.phone ? formatPhone(data.phone) : '');
          setSmsConsent(data.sms_consent || false);
          setPreferredChannel(data.preferred_channel || 'in_app');
          setPushEnabled(!!data.expo_push_token);
        }

        if (Notifications) {
          const { status } = await Notifications.getPermissionsAsync();
          if (!cancelled && status !== 'granted') setPushEnabled(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // ── Toggle handlers ──────────────────────────────────────

  async function handleTogglePush(value) {
    if (value && Notifications) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert(
          'Permission Required',
          'Please enable notifications in your device settings.',
        );
        return;
      }
    } else if (value && !Notifications) {
      alert(
        'Not Available',
        'Push notifications require a newer app build.',
      );
      return;
    }
    setPushEnabled(value);
  }

  async function handleToggleSms(value) {
    if (value && !phone.trim()) {
      alert(
        'Phone Required',
        'Please enter your phone number before enabling SMS.',
      );
      return;
    }
    setSmsConsent(value);
    if (value) {
      setPreferredChannel('sms');
    } else if (preferredChannel === 'sms') {
      setPreferredChannel('in_app');
    }
  }

  // ── Save ─────────────────────────────────────────────────

  const save = useCallback(async () => {
    if (smsConsent && !phone.trim()) {
      alert(
        'Phone Required',
        'Please enter your phone number to enable SMS.',
      );
      return false;
    }

    try {
      // Persist SMS consent (also sets phone + preferred_channel=sms when consent=true)
      await apiFetch('/api/profiles/sms-consent', {
        method: 'POST',
        body: JSON.stringify({
          consent: smsConsent,
          phone: smsConsent ? toE164(phone) : undefined,
        }),
      });

      // If channel is not SMS (or SMS was turned off), save preferred channel separately
      if (!smsConsent || preferredChannel !== 'sms') {
        await supabase
          .from('profiles')
          .update({ preferred_channel: preferredChannel })
          .eq('id', user.id);
      }

      if (onSaved) onSaved();
      return true;
    } catch (err) {
      alert('Error', err.message);
      return false;
    }
  }, [smsConsent, phone, preferredChannel, user, onSaved, alert]);

  // Expose save() to parent via ref
  useImperativeHandle(ref, () => ({ save }), [save]);

  // ── Loading state ────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  // ── Compact mode ─────────────────────────────────────────

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {context === 'wizard' && (
          <Text style={styles.compactTitle}>Get notified about inquiries</Text>
        )}
        {context === 'messages' && (
          <Text style={styles.compactTitle}>Want faster response times?</Text>
        )}

        {/* Push toggle */}
        <Toggle
          label="Push Notifications"
          hint="Instant alerts when tenants message you"
          value={pushEnabled}
          onValueChange={handleTogglePush}
        />

        {/* SMS toggle */}
        <Toggle
          label="SMS Alerts"
          hint="Text alerts for urgent messages"
          value={smsConsent}
          onValueChange={handleToggleSms}
        />

        {smsConsent && (
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={v => setPhone(formatPhone(v))}
            placeholder="(555) 123-4567"
            placeholderTextColor={COLORS.slate}
            keyboardType="phone-pad"
          />
        )}

        <Text style={styles.legalText}>
          Consent is not a condition of purchase or use. Msg &amp; data rates may apply.
          Frequency: 1–5/week. Reply STOP anytime.
        </Text>

        {context === 'wizard' && (
          <Text style={styles.socialProof}>
            Owners who enable push notifications respond 3x faster to tenant
            inquiries.
          </Text>
        )}

        {context === 'messages' && (
          <Text style={styles.socialProof}>
            Owners who respond within 1 hour are 4x more likely to secure a
            tenant.
          </Text>
        )}
      </View>
    );
  }

  // ── Full mode ────────────────────────────────────────────

  return (
    <View>
      {/* Push Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <Toggle
          label="Push Alerts"
          hint="Show alerts on your device when you receive a message"
          value={pushEnabled}
          onValueChange={handleTogglePush}
        />
      </View>

      {/* Preferred Channel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Channel</Text>
        <Text style={styles.sectionHint}>
          Choose how you'd like to be notified when someone messages you
        </Text>
        {CHANNELS.map(ch => (
          <TouchableOpacity
            key={ch.key}
            style={[
              styles.channelOption,
              preferredChannel === ch.key && styles.channelSelected,
            ]}
            onPress={() => {
              if (ch.key === 'sms' && !smsConsent) {
                alert(
                  'SMS Required',
                  'Please enable SMS notifications below first.',
                );
                return;
              }
              setPreferredChannel(ch.key);
            }}
          >
            <View style={styles.radioOuter}>
              {preferredChannel === ch.key && (
                <View style={styles.radioInner} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelLabel}>{ch.label}</Text>
              <Text style={styles.channelDesc}>{ch.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* SMS Consent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SMS Notifications</Text>
        <Toggle
          label="Enable SMS"
          hint="Receive text message notifications"
          value={smsConsent}
          onValueChange={handleToggleSms}
        />

        {smsConsent && (
          <>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={v => setPhone(formatPhone(v))}
              placeholder="(555) 123-4567"
              placeholderTextColor={COLORS.slate}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </>
        )}

        <Text style={styles.legalText}>
          By enabling SMS, you consent to receive transactional text message notifications from
          PadMagnet (e.g., inquiry alerts, listing reminders, message notifications). Consent is
          not a condition of purchase or use of the app. Msg &amp; data rates may apply. Msg frequency
          varies based on account activity, typically 1–5 per week. Reply STOP to unsubscribe at
          any time. Reply HELP for help.
        </Text>
        <Text style={styles.legalLinks}>
          Privacy Policy (padmagnet.com/privacy) · Terms of Service (padmagnet.com/terms)
        </Text>
      </View>
    </View>
  );
});

export default NotificationPreferences;

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Shared
  centered: {
    paddingVertical: LAYOUT.padding.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  rowHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  legalText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 12,
    lineHeight: 16,
  },
  legalLinks: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.accent,
    marginTop: 6,
    lineHeight: 14,
  },

  // Compact mode
  compactContainer: {
    paddingVertical: LAYOUT.padding.sm,
  },
  compactTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.sm,
  },
  socialProof: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
    marginTop: LAYOUT.padding.sm,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Full mode
  section: {
    marginBottom: LAYOUT.padding.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  channelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.radius.md,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  channelSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.card,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: LAYOUT.radius.xs,
    backgroundColor: COLORS.accent,
  },
  channelLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  channelDesc: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
