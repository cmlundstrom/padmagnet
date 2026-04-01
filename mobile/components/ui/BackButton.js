import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

/**
 * Global BackButton — X-app style left chevron.
 *
 * Spec (modeled after X/Twitter 2026):
 *   - Left-pointing chevron ("<"), no shaft
 *   - Round line-cap, stroke only, no fill
 *   - 24×24 icon in 44×44 hit area
 *   - Stroke width: 2.2pt
 *   - Color: COLORS.white (dark mode default)
 *
 * Props:
 *   onPress — optional custom handler (default: router.back())
 *   color   — optional icon color override
 *   style   — optional container style override
 */
export default function BackButton({ onPress, color, style }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={onPress || (() => router.back())}
      style={[styles.hitArea, style]}
      activeOpacity={0.6}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Polyline
          points="15,4 7,12 15,20"
          stroke={color || COLORS.white}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
