import { View, Text, Switch, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function Toggle({ label, value, onValueChange, style }) {
  return (
    <View style={[styles.row, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.success + '66' }}
        thumbColor={value ? COLORS.success : COLORS.slate}
        style={LAYOUT.switch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  label: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
