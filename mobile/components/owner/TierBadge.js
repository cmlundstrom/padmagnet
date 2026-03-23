import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function TierBadge({ tier, size = 'md' }) {
  if (!tier || tier === 'free') return null;

  const iconSize = size === 'sm' ? 12 : 16;

  if (tier === 'pro') {
    return (
      <View style={[styles.container, styles.proBadge]}>
        <Ionicons name="shield-checkmark" size={iconSize} color={COLORS.white} />
        {size !== 'sm' && <Text style={styles.proText}>Verified</Text>}
      </View>
    );
  }

  if (tier === 'premium') {
    return (
      <View style={[styles.container, styles.premiumBadge]}>
        <Ionicons name="diamond" size={iconSize} color={COLORS.gold} />
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
    backgroundColor: COLORS.accent + 'AA',
  },
  premiumText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
