import { useState, useEffect } from 'react';
import {
  View, Text, Switch, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeModules } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

// Only load expo-notifications if native module is present
const hasNotifications = !!NativeModules.ExpoPushTokenManager;
const Notifications = hasNotifications ? require('expo-notifications') : null;
import { useAlert } from '../../providers/AlertProvider';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

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

export default function NotificationsScreen() {
  const { user } = useAuth();
  const alert = useAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [phone, setPhone] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('in_app');

  // Load current profile settings
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('phone, sms_consent, preferred_channel, expo_push_token')
        .eq('id', user.id)
        .single();

      if (data) {
        setPhone(data.phone || '');
        setSmsConsent(data.sms_consent || false);
        setPreferredChannel(data.preferred_channel || 'in_app');
        setPushEnabled(!!data.expo_push_token);
      }

      // Check device push permission status
      if (Notifications) {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') setPushEnabled(false);
      }

      setLoading(false);
    })();
  }, [user]);

  async function handleTogglePush(value) {
    if (value && Notifications) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission Required', 'Please enable notifications in your device settings to receive push alerts.');
        return;
      }
    } else if (value && !Notifications) {
      alert('Not Available', 'Push notifications require a newer app build. Please update the app.');
      return;
    }
    setPushEnabled(value);
    // Token registration/clearing is handled by usePushNotifications hook in root layout
    // This toggle is informational — the real gating is device permission
  }

  async function handleToggleSms(value) {
    if (value && !phone.trim()) {
      alert('Phone Required', 'Please enter your phone number below before enabling SMS notifications.');
      return;
    }

    setSmsConsent(value);

    if (value) {
      setPreferredChannel('sms');
    } else if (preferredChannel === 'sms') {
      setPreferredChannel('in_app');
    }
  }

  async function handleSave() {
    if (smsConsent && !phone.trim()) {
      alert('Phone Required', 'Please enter your phone number to enable SMS notifications.');
      return;
    }

    setSaving(true);
    try {
      // Save SMS consent
      await apiFetch('/api/profiles/sms-consent', {
        method: 'POST',
        body: JSON.stringify({
          consent: smsConsent,
          phone: smsConsent ? toE164(phone) : undefined,
        }),
      });

      // Save preferred channel separately if not SMS (sms-consent endpoint auto-sets it)
      if (!smsConsent || preferredChannel !== 'sms') {
        await supabase
          .from('profiles')
          .update({ preferred_channel: preferredChannel })
          .eq('id', user.id);
      }

      alert('Saved', 'Your notification preferences have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: LAYOUT.padding.md }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveText, saving && { color: COLORS.slate }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Control how you receive message alerts</Text>

        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Push Alerts</Text>
              <Text style={styles.rowHint}>Show alerts on your device when you receive a message</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor={COLORS.white}
              style={LAYOUT.switch}
            />
          </View>
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
              style={[styles.channelOption, preferredChannel === ch.key && styles.channelSelected]}
              onPress={() => {
                if (ch.key === 'sms' && !smsConsent) {
                  alert('SMS Required', 'Please enable SMS notifications below first.');
                  return;
                }
                setPreferredChannel(ch.key);
              }}
            >
              <View style={styles.radioOuter}>
                {preferredChannel === ch.key && <View style={styles.radioInner} />}
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
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Enable SMS</Text>
              <Text style={styles.rowHint}>Receive text message notifications</Text>
            </View>
            <Switch
              value={smsConsent}
              onValueChange={handleToggleSms}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor={COLORS.white}
              style={LAYOUT.switch}
            />
          </View>

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
            By enabling SMS, you consent to receive text message notifications from PadMagnet
            about your conversations. Message and data rates may apply. Reply STOP to unsubscribe
            at any time. Reply HELP for help.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  cancelText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
  },
  saveText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.padding.lg,
  },
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
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  inputLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
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
    fontSize: 11,
    color: COLORS.slate,
    marginTop: 12,
    lineHeight: 16,
  },
});
