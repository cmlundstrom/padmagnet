import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../../constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * ProgressRing — animated circular progress indicator.
 *
 * Props:
 *   percent  — 0–100
 *   size     — diameter (default 36)
 *   stroke   — stroke width (default 3)
 *   color    — fill color (default accent blue, switches to success at 100%)
 */
export default function ProgressRing({ percent = 0, size = 36, stroke = 3, color }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percent / 100, { duration: 600 });
  }, [percent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const fillColor = color || (percent >= 100 ? COLORS.success : COLORS.accent);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Animated fill */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
