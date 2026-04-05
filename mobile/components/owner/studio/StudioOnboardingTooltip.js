import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT } from '../../../constants/layout';

/**
 * StudioOnboardingTooltip — shown once on first studio visit.
 * Explains the Smart Card interface. Dismissed with a tap.
 *
 * Props:
 *   visible   — boolean
 *   onDismiss — called when user taps "Got it"
 */
export default function StudioOnboardingTooltip({ visible, onDismiss }) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <BlurView intensity={40} tint="dark" style={styles.blur}>
        <View style={styles.card}>
          <Ionicons name="sparkles" size={32} color={COLORS.brandOrange} style={{ marginBottom: 12 }} />
          <Text style={styles.title}>Welcome to the Listing Studio</Text>
          <View style={styles.tipRow}>
            <Text style={styles.bullet}>{'\u2726'}</Text>
            <Text style={styles.tipText}>Tap any card to expand it and fill in your listing details.</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.bullet}>{'\u2726'}</Text>
            <Text style={styles.tipText}>Use the sparkle buttons to let Ask Pad write descriptions and suggest amenities from your photos.</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.bullet}>{'\u2726'}</Text>
            <Text style={styles.tipText}>Tap Preview anytime to see your listing as renters will.</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.bullet}>{'\u2726'}</Text>
            <Text style={styles.tipText}>Your progress saves automatically. Come back anytime!</Text>
          </View>
          <Pressable style={styles.gotItBtn} onPress={onDismiss}>
            <Text style={styles.gotItText}>Got it</Text>
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.padding.lg,
  },
  card: {
    backgroundColor: 'rgba(26,51,88,0.95)',
    borderRadius: LAYOUT.radius.xl,
    padding: LAYOUT.padding.lg,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(52,100,160,0.5)',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    width: '100%',
  },
  bullet: {
    fontSize: 14,
    color: COLORS.brandOrange,
    marginTop: 2,
  },
  tipText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  gotItBtn: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  gotItText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
