import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import BackButton from './BackButton';

/**
 * Branded auth header — back chevron + "Pad" / "Magnet" wordmark.
 * @param {Object} props
 * @param {Function} [props.onBack] - Custom back handler. Defaults to router.back().
 */
export default function AuthHeader({ onBack }) {
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} />
      <View style={styles.brand}>
        <Text style={styles.pad}>Pad</Text>
        <Text style={styles.magnet}>Magnet</Text>
      </View>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 12,
  },
  spacer: {
    width: 44,
    height: 44,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pad: {
    fontFamily: FONTS.heading.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  magnet: {
    fontFamily: FONTS.heading.bold,
    fontSize: 18,
    color: COLORS.deepOrange,
  },
});
