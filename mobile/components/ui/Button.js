import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const VARIANTS = {
  primary: {
    bg: COLORS.accent,
    text: COLORS.navy,
    border: 'transparent',
  },
  secondary: {
    bg: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
  },
  outline: {
    bg: 'transparent',
    text: COLORS.accent,
    border: COLORS.accent,
  },
  danger: {
    bg: COLORS.danger,
    text: COLORS.white,
    border: 'transparent',
  },
  ghost: {
    bg: 'transparent',
    text: COLORS.textSecondary,
    border: 'transparent',
  },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border !== 'transparent' ? 1 : 0,
          paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 16 : 12,
          paddingHorizontal: size === 'sm' ? 14 : size === 'lg' ? 28 : 20,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={v.text}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: v.text,
              fontSize: size === 'sm' ? FONT_SIZES.sm : size === 'lg' ? FONT_SIZES.lg : FONT_SIZES.md,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: LAYOUT.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontFamily: FONTS.body.semiBold,
    textAlign: 'center',
  },
});
