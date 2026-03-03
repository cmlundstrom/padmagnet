import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { SCREEN } from '../../constants/screenStyles';

export default function ServicesScreen() {
  return (
    <SafeAreaView style={SCREEN.container} edges={['top']}>
      <Text style={SCREEN.pageTitle}>Services</Text>
      <Text style={styles.subtitle}>Manage your subscription and payments</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
});
