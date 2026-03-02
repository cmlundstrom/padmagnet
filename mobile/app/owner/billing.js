import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

// Stripe billing management for owner listings
export default function BillingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Billing</Text>
      <Text style={styles.subtitle}>Manage your subscription and payments</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: LAYOUT.padding.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.heading.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
});
