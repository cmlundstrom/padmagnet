import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ProfileCard({ user, fallbackName }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>
        {user?.user_metadata?.display_name || fallbackName || 'User'}
      </Text>
      <Text style={styles.email}>{user?.email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.lg,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  name: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 4,
  },
  email: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
