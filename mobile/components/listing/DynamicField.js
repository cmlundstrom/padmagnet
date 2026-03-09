import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { Input } from '../ui';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Renders a form field based on listing_field_configs type.
 * Props:
 *   config: { field_key, label, type, required_for_owner, select_options }
 *   value: current field value
 *   onChange: (value) => void
 */
export default function DynamicField({ config, value, onChange }) {
  const { field_key, label, type, required_for_owner, select_options } = config;
  const displayLabel = required_for_owner ? `${label} *` : label;

  switch (type) {
    case 'text':
      return (
        <Input
          label={displayLabel}
          value={value || ''}
          onChangeText={onChange}
          placeholder={label}
        />
      );

    case 'number':
      return (
        <Input
          label={displayLabel}
          value={value != null ? String(value) : ''}
          onChangeText={v => onChange(v)}
          keyboardType="numeric"
          placeholder={label}
        />
      );

    case 'textarea':
      return (
        <Input
          label={displayLabel}
          value={value || ''}
          onChangeText={onChange}
          multiline
          numberOfLines={4}
          style={styles.textArea}
          placeholder={label}
        />
      );

    case 'boolean':
      return (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{displayLabel}</Text>
          <Switch
            value={!!value}
            onValueChange={onChange}
            trackColor={{ false: COLORS.border, true: COLORS.accent + '66' }}
            thumbColor={value ? COLORS.accent : COLORS.slate}
            style={LAYOUT.switch}
          />
        </View>
      );

    case 'select': {
      const options = select_options || [];
      return (
        <View style={styles.selectContainer}>
          <Text style={styles.label}>{displayLabel}</Text>
          <View style={styles.chipRow}>
            {options.map(opt => (
              <Pressable
                key={opt}
                style={[styles.chip, value === opt && styles.chipActive]}
                onPress={() => onChange(value === opt ? '' : opt)}
              >
                <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    case 'date':
      return (
        <Input
          label={displayLabel}
          value={value || ''}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
        />
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  selectContainer: {
    marginBottom: LAYOUT.padding.sm,
  },
  label: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: LAYOUT.padding.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent,
  },
  chipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.accent,
  },
});
