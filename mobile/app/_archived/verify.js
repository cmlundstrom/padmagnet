import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

// Placeholder — will integrate Twilio Verify for SMS + email verification
export default function VerifyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Identity</Text>
      <Text style={styles.subtitle}>SMS and email verification coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.padding.lg,
    backgroundColor: COLORS.background,
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
