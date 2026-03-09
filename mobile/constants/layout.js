import { Dimensions, StyleSheet } from 'react-native';
import { COLORS } from './colors';
import { FONTS, FONT_SIZES } from './fonts';

const { width, height } = Dimensions.get('window');

export const LAYOUT = {
  window: { width, height },
  padding: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  card: {
    width: width - 32,
    height: height * 0.58,
  },
  switch: {
    transform: [{ scale: 1.5 }],
  },
};

export const CHIP_STYLES = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.success + '22',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  chipActive: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent,
  },
  chipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  chipTextActive: {
    color: COLORS.accent,
  },
});
