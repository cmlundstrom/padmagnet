import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  labelStyle,
  onBlur: onBlurProp,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        multiline && { flexDirection: 'column', alignItems: 'stretch' },
        focused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? undefined : numberOfLines}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlurProp?.(); }}
          onContentSizeChange={multiline ? (e) => setContentHeight(e.nativeEvent.contentSize.height) : undefined}
          scrollEnabled={multiline ? false : undefined}
          style={[
            styles.input,
            multiline && {
              height: Math.max(numberOfLines * 22, contentHeight + 8),
              textAlignVertical: 'top',
            },
            inputStyle,
          ]}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputFocused: {
    borderColor: COLORS.accent,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggle: {
    paddingHorizontal: 14,
  },
  toggleText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  error: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    marginTop: 4,
  },
});
