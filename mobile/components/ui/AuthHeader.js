import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Branded auth header — frosted-glass back pill + "Pad" / "Magnet" wordmark.
 * @param {Object} props
 * @param {Function} [props.onBack] - Custom back handler. Defaults to router.back().
 */
export default function AuthHeader({ onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.backPill}>
        <FontAwesome name="arrow-left" size={16} color={COLORS.white} />
      </TouchableOpacity>
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
  backPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.frostedGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 40,
    height: 40,
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
