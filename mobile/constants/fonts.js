// Typography — Outfit for headings, DM Sans for body
// Fonts loaded in _layout.js via expo-font
// ALL font families and sizes MUST reference this file.
export const FONTS = {
  heading: {
    regular: 'Outfit-Regular',
    medium: 'Outfit-Medium',
    semiBold: 'Outfit-SemiBold',
    bold: 'Outfit-Bold',
  },
  body: {
    regular: 'DMSans-Regular',
    medium: 'DMSans-Medium',
    semiBold: 'DMSans-SemiBold',
    bold: 'DMSans-Bold',
  },
};

export const FONT_SIZES = {
  xxs: 10,    // Legal text, disclaimers, timestamps
  xs: 12,     // Badges, captions, secondary labels
  sm: 14,     // Body text, list items
  md: 16,     // Primary body, inputs
  lg: 18,     // Section headings, emphasized text
  xl: 22,     // Page titles
  '2xl': 28,  // Large headings
  '3xl': 34,  // Hero headings
  '4xl': 38,  // Welcome screen wordmark
  '5xl': 48,  // Onboarding hero numbers
};
