import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

function getScoreColor(score) {
  if (score >= 75) return COLORS.padscoreHigh;
  if (score >= 50) return COLORS.padscoreMid;
  return COLORS.padscoreLow;
}

export default function Badge({ score, size = 'md', style }) {
  const color = getScoreColor(score);
  const isSmall = size === 'sm';

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: '#3B82F6' + '55',
        borderColor: '#3B82F6' + '88',
        paddingHorizontal: isSmall ? 6 : 10,
        paddingVertical: isSmall ? 2 : 4,
      },
      style,
    ]}>
      <Text style={[
        styles.text,
        {
          color: '#FFFFFF',
          fontSize: isSmall ? FONT_SIZES.xs : FONT_SIZES.sm,
        },
      ]}>
        {score}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: FONTS.heading.bold,
  },
});
