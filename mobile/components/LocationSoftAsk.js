import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

/**
 * Location soft-ask overlay — shown once on the swipe screen before
 * triggering the native OS location permission dialog.
 *
 * "Enable" fires the callback that triggers the real OS prompt.
 * "Not now" dismisses and falls back to search-zone-based results.
 */
export default function LocationSoftAsk({ onEnable, onSkip }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <FontAwesome name="map-marker" size={36} color={COLORS.white} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>See rentals near you</Text>

        {/* Body */}
        <Text style={styles.body}>
          PadMagnet uses your location to show listings closest to where you
          are right now — so the best matches appear first.
        </Text>

        {/* Enable CTA */}
        <TouchableOpacity
          style={styles.enableButton}
          onPress={onEnable}
          activeOpacity={0.8}
        >
          <FontAwesome
            name="location-arrow"
            size={16}
            color={COLORS.white}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.enableText}>Enable Location</Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.scrimDarker,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    marginHorizontal: LAYOUT.padding.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    width: LAYOUT.card.width,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  heading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  body: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: LAYOUT.padding.lg,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.logoOrange,
    borderRadius: LAYOUT.radius.xl,
    paddingVertical: 14,
    paddingHorizontal: LAYOUT.padding.xl,
    width: '100%',
    marginBottom: LAYOUT.padding.md,
  },
  enableText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  skipButton: {
    paddingVertical: LAYOUT.padding.sm,
  },
  skipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
  },
});
