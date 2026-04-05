import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../../constants/colors';

/**
 * AskPadOrbOwner — floating Ask Pad orb for the owner Listing Studio.
 * Uses the same askpad-orb.png asset but is a completely separate component
 * from the renter AskPadOrb. Owner-only, contextual AI help.
 *
 * Props:
 *   onPress — called when orb is tapped (opens contextual AI helper)
 */
export default function AskPadOrbOwner({ onPress }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800 }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
    shadowOpacity: interpolate(pulse.value, [0, 1], [0.25, 0.5]),
  }));

  return (
    <Animated.View style={[styles.orbWrap, animStyle]}>
      <Pressable
        style={styles.orb}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        hitSlop={12}
      >
        <Image
          source={require('../../../assets/images/askpad-orb.png')}
          style={styles.orbImage}
          contentFit="contain"
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orbWrap: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  orb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  orbImage: {
    width: 32,
    height: 32,
  },
});
