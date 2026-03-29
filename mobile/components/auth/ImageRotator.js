import { useEffect, useRef, useState } from 'react';
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
  const animatedStyle = useAnimatedStyle(function() {
    return { opacity: opacity.value };
  });

  return (
    <Animated.View style={[styles.imageWrapper, animatedStyle]}>
      <Image source={source} style={styles.image} contentFit="cover" />
    </Animated.View>
  );
}

export default function ImageRotator({ images, interval = 4000 }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const indexRef = useRef(0);

  const opacity0 = useSharedValue(1);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacities = useRef([opacity0, opacity1, opacity2]).current;

  useEffect(function() {
    var timer = setInterval(function() {
      var prev = indexRef.current;
      var next = (prev + 1) % images.length;
      var timing = { duration: 800, easing: Easing.inOut(Easing.ease) };

      // Animate outside of setState — avoid render-time shared value writes
      opacities[prev].value = withTiming(0, timing);
      opacities[next].value = withTiming(1, timing);

      indexRef.current = next;
      setActiveIndex(next);
    }, interval);
    return function() { clearInterval(timer); };
  }, [images.length, interval, opacities]);

  return (
    <View style={styles.container}>
      {images.map(function(source, index) {
        return (
          <FadeImage
            key={index}
            source={source}
            opacity={opacities[index]}
          />
        );
      })}

      <View style={styles.dots}>
        {images.map(function(_, index) {
          return (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          );
        })}
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
