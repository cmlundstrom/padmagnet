import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import BackButton from './BackButton';

export default function Header({ title, showBack = false, onBack, rightAction, style }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {showBack && <BackButton onPress={onBack} />}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>
        {rightAction || null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  left: {
    minWidth: 48,
    alignItems: 'flex-start',
  },
  right: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    textAlign: 'center',
  },
});
