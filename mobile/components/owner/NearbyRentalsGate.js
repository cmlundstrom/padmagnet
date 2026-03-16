import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Overlay shown when owner does not have access to Nearby Rentals.
 * Shows blurred/dimmed content behind with a purchase CTA.
 */
export default function NearbyRentalsGate({ access, onPurchase }) {
  const router = useRouter();

  if (access?.granted) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <FontAwesome name="lock" size={32} color={COLORS.accent} />
        <Text style={styles.title}>Nearby Rentals Access</Text>
        <Text style={styles.description}>
          See active rental listings near your property. Compare asking rents, beds/baths, and sqft in your area.
        </Text>
        <Text style={styles.trialNote}>
          30-day access included free with your first listing.
        </Text>
        <Pressable style={styles.purchaseBtn} onPress={onPurchase}>
          <Text style={styles.purchaseText}>Unlock for $9</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Go Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayNavy,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    width: '85%',
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginTop: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
  },
  description: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: LAYOUT.padding.sm,
  },
  trialNote: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.lg,
  },
  purchaseBtn: {
    width: '100%',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: LAYOUT.radius.md,
    alignItems: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  purchaseText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  backText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
