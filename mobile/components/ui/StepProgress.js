import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Progress bar with "Step X of Y — Label" text.
 * Used in owner create listing and tenant onboarding flows.
 *
 * @param {number} current - Current step index (0-based)
 * @param {string[]} steps - Array of step labels
 * @param {number} [startAt=0] - First step index to count from (skip welcome screens)
 */
export default function StepProgress({ current, steps, startAt = 0, subtitle }) {
  const totalVisible = steps.length - startAt;
  const currentVisible = current - startAt + 1;

  // Don't render if before the first countable step
  if (current < startAt) return null;

  const progress = currentVisible / totalVisible;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Step {currentVisible} of {totalVisible}
        <Text style={styles.labelName}> — {steps[current]}</Text>
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
  label: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: 6,
  },
  labelName: {
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
  track: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});
