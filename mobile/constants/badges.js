import { COLORS } from './colors';
import { FONTS, FONT_SIZES } from './fonts';
import { LAYOUT } from './layout';

// Badge style definitions — used by TierBadge, SwipeCard, ListingCard
export const BADGE_STYLES = {
  priceDrop: {
    container: {
      backgroundColor: COLORS.success,
      paddingHorizontal: LAYOUT.padding.sm,
      paddingVertical: LAYOUT.padding.xs,
      borderRadius: LAYOUT.radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: LAYOUT.padding.xs,
    },
    text: {
      color: COLORS.white,
      fontFamily: FONTS.body.semiBold,
      fontSize: FONT_SIZES.xxs,
    },
    icon: { size: 10 },
  },
  verified: {
    color: COLORS.accent,
    icon: 'checkmark-circle',
    size: LAYOUT.iconSize.md,
    label: 'Verified Owner',
  },
  featured: {
    borderColor: COLORS.gold,
    borderWidth: 2,
    label: 'Featured',
  },
  tierPill: {
    pro: {
      backgroundColor: COLORS.accent,
      label: 'PRO',
      textColor: COLORS.white,
    },
    premium: {
      backgroundColor: COLORS.gold,
      label: 'PREMIUM',
      textColor: COLORS.black,
    },
  },
};
