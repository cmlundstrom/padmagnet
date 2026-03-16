import { useEffect, useCallback, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';

function FadeImage({ source, opacity }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.imageWrapper, animatedStyle]}>
      <Image source={source} style={styles.image} contentFit="cover" />
    </Animated.View>
  );
}

export default function ImageRotator({ images, interval = 4000 }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Create exactly 3 shared values (matching our 3 welcome images)
  const opacity0 = useSharedValue(1);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacities = useRef([opacity0, opacity1, opacity2]).current;

  const rotate = useCallback(() => {
    setActiveIndex((prev) => {
      const next = (prev + 1) % images.length;
      const timing = { duration: 800, easing: Easing.inOut(Easing.ease) };

      opacities[prev].value = withTiming(0, timing);
      opacities[next].value = withTiming(1, timing);

      return next;
    });
  }, [images.length, opacities]);

  useEffect(() => {
    const timer = setInterval(rotate, interval);
    return () => clearInterval(timer);
  }, [rotate, interval]);

  return (
    <View style={styles.container}>
      {images.map((source, index) => (
        <FadeImage
          key={index}
          source={source}
          opacity={opacities[index]}
        />
      ))}

      {/* Dot indicators */}
      <View style={styles.dots}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: LAYOUT.radius.xl,
    borderBottomRightRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white + '55',
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 20,
  },
});
