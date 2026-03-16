import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

// Trust Layer verification status — email, SMS, identity
export default function VerificationScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Verification Status</Text>
      <Text style={styles.subtitle}>Build trust to connect faster</Text>
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
