/**
 * Report objectionable content — listing, user, message, or conversation.
 *
 * Required by Google Play UGC Policy for any app that accepts UGC.
 * Submits to POST /api/reports with categorized reason + optional 500-char
 * free-text. Anti-flood: backend dedupes per-reporter-per-target via a
 * partial unique index, so double-tapping submit returns 200 + duplicate.
 *
 * Usage:
 *   <ReportSheet
 *     visible={show}
 *     onClose={() => setShow(false)}
 *     contentType="listing"   // 'listing' | 'user' | 'message' | 'conversation'
 *     contentId={listing.id}
 *     contentLabel="this listing"
 *   />
 */

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, Modal,
  ActivityIndicator, ScrollView, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '../../lib/api';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

// Maps backend reason codes (content_reports.reason_code CHECK constraint)
// to user-facing labels. Order is also display order in the UI.
const REASONS = [
  { code: 'spam',            label: 'Spam',                   description: 'Repeated, unsolicited, or irrelevant content' },
  { code: 'fake_listing',    label: 'Fake or misleading',     description: 'Listing details, photos, or pricing are inaccurate' },
  { code: 'scam',            label: 'Scam',                   description: 'Asking for money, deposits, or personal info before viewing' },
  { code: 'harassment',      label: 'Harassment or abuse',    description: 'Threatening, hostile, or discriminatory messages' },
  { code: 'sexual_content',  label: 'Sexual content',         description: 'Explicit, inappropriate, or sexually suggestive material' },
  { code: 'hate_speech',     label: 'Hate speech',            description: 'Targeting protected groups, slurs, or discrimination' },
  { code: 'illegal',         label: 'Illegal activity',       description: 'Suspicious of fraud, prohibited goods, or law violations' },
  { code: 'other',           label: 'Other',                  description: 'Use the box below to explain' },
];

const FREE_TEXT_MAX = 500;

export default function ReportSheet({
  visible,
  onClose,
  contentType,
  contentId,
  contentLabel = 'this',
}) {
  const alert = useAlert();
  const [selectedReason, setSelectedReason] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state when reopening so prior selections don't bleed across reports
  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setFreeText('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedReason || submitting) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const result = await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          reason_code: selectedReason,
          free_text: freeText.trim() || null,
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      const msg = result?.duplicate
        ? "You've already reported this. Our team is reviewing it."
        : 'Report submitted. Our team will review it within 48 hours.';
      alert('Thanks for letting us know', msg);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Could not submit report', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
            testID="report-sheet-close"
          >
            <Ionicons name="close" size={26} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>Report {contentLabel}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Tell us what's wrong. Your report is private — the person you're
            reporting won't be notified. Our team reviews every submission.
          </Text>

          <Text style={styles.sectionLabel}>Reason</Text>
          {REASONS.map((r) => {
            const active = selectedReason === r.code;
            return (
              <Pressable
                key={r.code}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedReason(r.code);
                }}
                style={[styles.reasonRow, active && styles.reasonRowActive]}
                testID={`report-reason-${r.code}`}
              >
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioInner} />}
                </View>
                <View style={styles.reasonLabels}>
                  <Text style={[styles.reasonLabel, active && styles.reasonLabelActive]}>
                    {r.label}
                  </Text>
                  <Text style={styles.reasonDesc} numberOfLines={2}>
                    {r.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Additional details (optional)
          </Text>
          <TextInput
            style={styles.textArea}
            multiline
            maxLength={FREE_TEXT_MAX}
            placeholder="Anything else our team should know?"
            placeholderTextColor={COLORS.textTertiary || '#7d8a9c'}
            value={freeText}
            onChangeText={setFreeText}
            textAlignVertical="top"
            testID="report-free-text"
          />
          <Text style={styles.charCount}>{freeText.length} / {FREE_TEXT_MAX}</Text>

          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
            testID="report-submit"
            style={({ pressed }) => [
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              (!selectedReason || submitting) && { opacity: 0.4 },
            ]}
          >
            <LinearGradient
              colors={[COLORS.logoOrange, '#D14E2F', '#B8432A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitText}>Submit report</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: LAYOUT.padding.md,
  },
  intro: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.radius.md,
    marginBottom: 6,
    backgroundColor: COLORS.surface || '#1a2438',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonRowActive: {
    borderColor: COLORS.logoOrange,
    backgroundColor: 'rgba(245, 124, 64, 0.08)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  radioActive: {
    borderColor: COLORS.logoOrange,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.logoOrange,
  },
  reasonLabels: {
    flex: 1,
  },
  reasonLabel: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  reasonLabelActive: {
    color: COLORS.logoOrange,
  },
  reasonDesc: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  textArea: {
    minHeight: 100,
    maxHeight: 180,
    backgroundColor: COLORS.surface || '#1a2438',
    borderRadius: LAYOUT.radius.md,
    padding: 14,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  charCount: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: LAYOUT.padding.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  submitBtn: {
    height: 52,
    borderRadius: LAYOUT.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
