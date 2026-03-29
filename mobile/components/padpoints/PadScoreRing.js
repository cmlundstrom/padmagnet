import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  useAnimatedReaction, withTiming, withSpring, withSequence, Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 56;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function PadScoreRing({ progress, level, padpoints, lastEarned }) {
  const animatedProgress = useSharedValue(progress || 0);
  const scaleValue = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const lastEarnedId = useSharedValue(0);

  const levelColor = level.level >= 4 ? COLORS.gold :
                     level.level >= 3 ? COLORS.brandOrange :
                     level.level >= 2 ? COLORS.success : COLORS.accent;

  // React to progress changes via useAnimatedReaction (not useEffect)
  useAnimatedReaction(
    function() { return progress; },
    function(curr, prev) {
      if (curr !== prev) {
        animatedProgress.value = withTiming(curr, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
      }
    },
    [progress]
  );

  // React to lastEarned changes for pulse
  useAnimatedReaction(
    function() { return lastEarned ? 1 : 0; },
    function(curr, prev) {
      if (curr > 0 && curr !== prev) {
        scaleValue.value = withSequence(
          withSpring(1.15, { damping: 4, stiffness: 200 }),
          withSpring(1, { damping: 8, stiffness: 150 })
        );
        glowOpacity.value = withSequence(
          withTiming(0.6, { duration: 150 }),
          withTiming(0, { duration: 500 })
        );
      }
    },
    [lastEarned]
  );

  const animatedCircleProps = useAnimatedProps(function() {
    return { strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value) };
  });

  const containerStyle = useAnimatedStyle(function() {
    return { transform: [{ scale: scaleValue.value }] };
  });

  const glowStyle = useAnimatedStyle(function() {
    return { opacity: glowOpacity.value };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.glow, glowStyle, { backgroundColor: levelColor }]} />
      <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={COLORS.border}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={levelColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.centerText}>
        <Text style={[styles.points, { color: levelColor }]}>{padpoints}</Text>
        <Text style={styles.label}>PP</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  glow: {
    position: 'absolute',
    width: RING_SIZE + 12,
    height: RING_SIZE + 12,
    borderRadius: (RING_SIZE + 12) / 2,
  },
  centerText: {
    alignItems: 'center',
  },
  points: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    lineHeight: 16,
  },
  label: {
    fontFamily: FONTS.body.medium,
    fontSize: 7,
    color: COLORS.slate,
    letterSpacing: 0.5,
  },
});
