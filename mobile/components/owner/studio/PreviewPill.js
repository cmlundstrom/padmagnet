import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ProgressRing from './ProgressRing';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT } from '../../../constants/layout';

/**
 * PreviewPill — floating pill showing mini photo + completion ring.
 * Tapping opens the ListingPreviewSheet.
 *
 * Props:
 *   firstPhoto        — URL of first listing photo (or null)
 *   completionPercent — 0–100
 *   onPress           — opens preview sheet
 */
export default function PreviewPill({ firstPhoto, completionPercent, onPress }) {
  return (
    <Pressable style={styles.pill} onPress={onPress} hitSlop={8}>
      <View style={styles.thumbWrap}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="eye-outline" size={16} color={COLORS.textSecondary} />
          </View>
        )}
      </View>
      <Text style={styles.label}>Preview</Text>
      <ProgressRing percent={completionPercent} size={24} stroke={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(52,100,160,0.5)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  thumbWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
