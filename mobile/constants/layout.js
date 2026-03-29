import { Dimensions, StyleSheet } from 'react-native';
import { COLORS } from './colors';
import { FONTS, FONT_SIZES } from './fonts';

const { width, height } = Dimensions.get('window');

export const LAYOUT = {
  window: { width, height },

  // ── Spacing scale ────────────────────────────────────────
  // Use for padding, margin, and gap values
  padding: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },

  // ── Border radius scale ──────────────────────────────────
  radius: {
    xs: 4,     // Progress bars, tiny elements
    sm: 8,     // Inputs, small cards
    md: 12,    // Cards, modals, badges
    lg: 16,    // Large cards, sheets
    xl: 24,    // Rounded buttons, large elements
    '2xl': 28, // Pill buttons, FABs
    full: 9999, // Circles, chips
  },

  // ── Component dimensions ─────────────────────────────────
  card: {
    width: width - 32,
    height: height * 0.52,
  },
  avatar: { sm: 36, md: 52, lg: 72 },
  imageHeight: { card: 150, map: 90, gallery: 300 },
  iconSize: { xs: 8, sm: 12, md: 16, lg: 24, xl: 36 },
  badgeOffset: { sm: 6, md: 12 },
  switch: {
    transform: [{ scale: 1.5 }],
  },
};

// ── Chip styles (shared across all chip/tag/toggle UIs) ────
export const CHIP_STYLES = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: LAYOUT.padding.sm,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.accent + '22',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  chipActive: {
    backgroundColor: COLORS.success + '22',
    borderColor: COLORS.success,
  },
  chipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  chipTextActive: {
    color: COLORS.white,
  },
});
