import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

/**
 * Shared loading state for the swipe deck (Cards / Map / List view modes).
 * Centered spinner + a one-line caption that explains what we're waiting on
 * so the 5-30s first-launch wait doesn't look like a hung app.
 *
 * Phases (computed in swipe.js, passed in as `phase`):
 *   'gps'      → useLocation is resolving the GPS lock (cold-start: 200ms-30s)
 *   'listings' → GPS done, /api/listings fetch in flight (200-800ms typical)
 *   null       → no copy, render nothing here
 *
 * `gpsSlow=true` swaps the gps-phase copy to a reassuring line after 10s
 * since Android cold-start GPS can spike to 30s and the static line for that
 * long reads as broken.
 */
const COPY = {
  gps:        'Finding rentals near you...',
  gpsSlow:    'We’re working to find your best options. Almost there!',
  listings:   'Building your feed...',
};

export default function LoadingState({ phase, gpsSlow }) {
  if (!phase) return null;
  const text =
    phase === 'gps'
      ? (gpsSlow ? COPY.gpsSlow : COPY.gps)
      : COPY.listings;
  return (
    <View style={styles.container} testID="swipe-loading-state">
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.caption}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  caption: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
