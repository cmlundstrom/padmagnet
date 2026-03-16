import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

/**
 * Branded placeholder for listings with no photos.
 * Three size variants to fit different card contexts.
 *
 * @param {'full' | 'card' | 'thumb'} size
 *   - full:  Photo gallery / swipe card (large icon, two-line text)
 *   - card:  List view grid card (medium icon, one-line text)
 *   - thumb: Conversation item / nearby grid (small icon only)
 */
export default function NoPhotoPlaceholder({ size = 'full', style }) {
  const config = SIZES[size] || SIZES.full;

  return (
    <LinearGradient
      colors={[COLORS.gradientDark1, COLORS.gradientDark2]}
      style={[styles.container, style]}
    >
      <FontAwesome name="camera" size={config.iconSize} color={COLORS.white} style={styles.icon} />
      {config.showText && (
        <Text style={[styles.label, { fontSize: config.fontSize }]}>
          No Photos Available
        </Text>
      )}
    </LinearGradient>
  );
}

const SIZES = {
  full:  { iconSize: 36, fontSize: FONT_SIZES.md, showText: true },
  card:  { iconSize: 24, fontSize: FONT_SIZES.xs, showText: true },
  thumb: { iconSize: 16, fontSize: 0, showText: false },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    opacity: 0.35,
    marginBottom: 8,
  },
  label: {
    fontFamily: FONTS.body.medium,
    color: COLORS.white,
    opacity: 0.5,
  },
});
