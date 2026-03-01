import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Badge } from '../ui';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function PadScoreBreakdown({ padScore }) {
  const [expanded, setExpanded] = useState(false);

  if (!padScore) return null;

  const { score, factors = [], explanation } = padScore;

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.headerLeft}>
          <Badge score={score} />
          <View style={styles.headerText}>
            <Text style={styles.title}>PadScore</Text>
            <Text style={styles.explanation} numberOfLines={expanded ? undefined : 1}>
              {explanation}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && factors.length > 0 && (
        <View style={styles.factors}>
          {factors.map((factor, index) => (
            <View key={factor.key + index} style={styles.factorRow}>
              <View style={styles.factorLeft}>
                <Text style={[styles.factorIcon, { color: factor.match ? COLORS.success : COLORS.danger }]}>
                  {factor.match ? '✓' : '✕'}
                </Text>
                <Text style={styles.factorLabel}>{factor.label}</Text>
              </View>
              {factor.impact !== 0 && (
                <Text style={[
                  styles.factorImpact,
                  { color: factor.impact > 0 ? COLORS.success : COLORS.danger },
                ]}>
                  {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    marginHorizontal: LAYOUT.padding.md,
    marginTop: LAYOUT.padding.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: LAYOUT.padding.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  explanation: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  factors: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: LAYOUT.padding.sm,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  factorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorIcon: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.heading.bold,
    width: 18,
    textAlign: 'center',
  },
  factorLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  factorImpact: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
  },
});
