import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProgressRing from './ProgressRing';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT } from '../../../constants/layout';

/**
 * StudioHeader — branded header for the Magic Listing Studio.
 *
 * Props:
 *   title           — header text
 *   completionPercent — 0–100 for the progress ring
 */
export default function StudioHeader({ title = 'Listing Studio', completionPercent = 0 }) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.ringWrap}>
        <ProgressRing percent={completionPercent} size={34} stroke={3} />
        <Text style={styles.ringLabel}>{completionPercent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52,100,160,0.3)',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  ringWrap: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringLabel: {
    position: 'absolute',
    fontFamily: FONTS.body.bold,
    fontSize: 9,
    color: COLORS.textSecondary,
  },
});
