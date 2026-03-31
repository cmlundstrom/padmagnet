import { View, Text, Switch, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Global Toggle — single source of truth for all in-app switches.
 *
 * Style: X-app inspired
 *   OFF: dark muted track (#3A3A3C), light gray thumb (#AAAAAA), no label
 *   ON:  green track (COLORS.success), white thumb, green "ON" label above
 *
 * Props:
 *   label         — optional text label to the left
 *   hint          — optional smaller text below the label
 *   value         — boolean
 *   onValueChange — callback
 *   style         — optional container style override
 */
export default function Toggle({ label, hint, value, onValueChange, style }) {
  return (
    <View style={[styles.row, style]}>
      {(label || hint) && (
        <View style={styles.textWrap}>
          {label && <Text style={styles.label}>{label}</Text>}
          {hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
      )}
      <View style={styles.switchWrap}>
        {value && <Text style={styles.onLabel}>ON</Text>}
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#3A3A3C', true: COLORS.success }}
          thumbColor={value ? COLORS.white : '#AAAAAA'}
          style={LAYOUT.switch}
        />
      </View>
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
  textWrap: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  switchWrap: {
    alignItems: 'center',
  },
  onLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 9,
    color: COLORS.success,
    letterSpacing: 0.5,
    marginBottom: -2,
  },
});
