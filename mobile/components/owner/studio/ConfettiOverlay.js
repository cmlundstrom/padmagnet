import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence,
  interpolate, Easing, runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';

const { width: SW, height: SH } = Dimensions.get('window');
const PARTICLE_COUNT = 35;
const CONFETTI_COLORS = ['#F97316', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

/**
 * ConfettiOverlay — full-screen confetti burst on listing publish.
 *
 * Props:
 *   visible    — triggers the animation
 *   onFinish   — called after animation completes (~3.5s)
 */
export default function ConfettiOverlay({ visible, onFinish }) {
  const opacity = useSharedValue(0);

  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: randomBetween(0, SW),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: randomBetween(6, 14),
      delay: randomBetween(0, 400),
      duration: randomBetween(2000, 3000),
      rotation: randomBetween(-180, 180),
      drift: randomBetween(-60, 60),
    })),
    []
  );

  useEffect(() => {
    if (!visible) return;
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(2800, withTiming(0, { duration: 500 }, () => {
        if (onFinish) runOnJS(onFinish)();
      }))
    );
    // Haptic celebration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      {particles.map(p => (
        <Particle key={p.id} {...p} />
      ))}
      <View style={styles.messageWrap}>
        <Text style={styles.emoji}>{'\u{1F389}'}</Text>
        <Text style={styles.title}>Your listing is live!</Text>
        <Text style={styles.subtitle}>Already being shown to renters in the Explore tab</Text>
      </View>
    </Animated.View>
  );
}

function Particle({ x, color, size, delay, duration, rotation, drift }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.quad) })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, drift]) },
      { translateY: interpolate(progress.value, [0, 1], [-20, SH * 0.7]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, rotation])}deg` },
      { scale: interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0.3]) },
    ],
    opacity: interpolate(progress.value, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: x, width: size, height: size * 0.6, backgroundColor: color, borderRadius: 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  particle: {
    position: 'absolute',
    top: -10,
  },
  messageWrap: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
