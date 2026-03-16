import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { BADGE_STYLES } from '../../constants/badges';

export default function TierBadge({ tier, size = 'md' }) {
  if (!tier || tier === 'free') return null;

  if (tier === 'pro') {
    return (
      <View style={[styles.container, styles.proBadge]}>
        <Ionicons name="checkmark-circle" size={size === 'sm' ? 12 : 16} color={COLORS.white} />
        {size !== 'sm' && <Text style={styles.proText}>Verified</Text>}
      </View>
    );
  }

  if (tier === 'premium') {
    return (
      <View style={[styles.container, styles.premiumBadge]}>
        <Ionicons name="star" size={size === 'sm' ? 12 : 16} color={COLORS.black} />
        {size !== 'sm' && <Text style={styles.premiumText}>Featured</Text>}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.padding.xs,
    paddingHorizontal: LAYOUT.padding.sm,
    paddingVertical: LAYOUT.padding.xs,
    borderRadius: LAYOUT.radius.sm,
  },
  proBadge: {
    backgroundColor: COLORS.accent,
  },
  proText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumBadge: {
    backgroundColor: COLORS.gold,
  },
  premiumText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
