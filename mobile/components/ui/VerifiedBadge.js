import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

/**
 * Verified Renter Badge — blue checkmark for Pad Master tier.
 * Appears on PadScore Dashboard, message threads, listing detail.
 * Uses brand accent blue (#3B82F6).
 */
export default function VerifiedBadge({ size = 'sm', showLabel = true }) {
  const iconSize = size === 'lg' ? 18 : size === 'md' ? 14 : 12;
  const fontSize = size === 'lg' ? FONT_SIZES.sm : size === 'md' ? FONT_SIZES.xs : FONT_SIZES.xxs;

  return (
    <View style={styles.container}>
      <View style={[styles.circle, { width: iconSize + 4, height: iconSize + 4 }]}>
        <Ionicons name="checkmark" size={iconSize - 2} color={COLORS.white} />
      </View>
      {showLabel && <Text style={[styles.label, { fontSize }]}>Verified Renter</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    backgroundColor: COLORS.accent, // #3B82F6
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.body.semiBold,
    color: COLORS.accent,
  },
});
