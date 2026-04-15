import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, runOnJS,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

/**
 * Global BackButton — X-app style left chevron with animated press ring.
 *
 * On press-in:  semi-transparent ring appears around the icon
 * On release:   ring flashes brighter briefly, then navigates back
 */
export default function BackButton({ onPress, color, style, testID = 'back-button' }) {
  const router = useRouter();
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(1);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  function handlePressIn() {
    ringOpacity.value = withTiming(0.15, { duration: 100 });
    ringScale.value = withTiming(1, { duration: 100 });
  }

  function handlePressOut() {
    // Flash brighter on release, then fade
    ringOpacity.value = withSequence(
      withTiming(0.35, { duration: 80 }),
      withTiming(0, { duration: 250 }),
    );
    ringScale.value = withSequence(
      withTiming(1.1, { duration: 80 }),
      withTiming(1, { duration: 250 }),
    );
  }

  function handlePress() {
    // Small delay so the user sees the release flash before navigating
    setTimeout(() => {
      if (onPress) {
        onPress();
      } else {
        router.back();
      }
    }, 100);
  }

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.hitArea, style]}
    >
      {/* Animated ring */}
      <Animated.View style={[styles.ring, ringStyle]} />

      {/* Chevron icon */}
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" style={styles.icon}>
        <Polyline
          points="15,4 7,12 15,20"
          stroke={color || COLORS.white}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
  },
  icon: {
    position: 'absolute',
  },
});
