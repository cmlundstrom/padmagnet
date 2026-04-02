import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

/**
 * Equal Housing Opportunity badge — Fair Housing Act compliance.
 * Displays the standard "Equal Housing Opportunity" slogan with house icon.
 * Use in: AskPad empty state, listing detail footer, profile footer.
 */
export default function EqualHousingBadge({ style }) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="home-outline" size={12} color={COLORS.slate} />
      <Text style={styles.text}>Equal Housing Opportunity</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  text: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    letterSpacing: 0.3,
  },
});
