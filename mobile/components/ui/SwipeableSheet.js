import { useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions, BackHandler } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DragHandle from './DragHandle';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;

/**
 * SwipeableSheet — KingCard standard bottom sheet.
 *
 * The unified card base for PadMagnet overlay cards.
 * Standard: 88% width, dual-bar handle + chevron + shaded header band,
 * 24px top radius, drag-to-dismiss + tap-outside dismiss.
 *
 * Props:
 *   visible     — boolean, controls visibility
 *   onClose     — called when dismissed
 *   children    — sheet content
 *   sheetStyle  — optional additional styles for the sheet container
 *   handleTint  — 'light' (default, white bars on dark) or 'dark' (brown bars on manila)
 */
export default function SwipeableSheet({ visible, onClose, children, sheetStyle, handleTint }) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const isDark = handleTint === 'dark';

  useEffect(() => {
    if (visible) {
      translateY.value = SCREEN_HEIGHT;
      translateY.value = withSpring(0, { damping: 18, stiffness: 140 });
    }
  }, [visible]);

  function handleDismiss() {
    onClose?.();
  }

  function animateAndClose() {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
      runOnJS(handleDismiss)();
    });
  }

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
          runOnJS(handleDismiss)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Android back button handler
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      animateAndClose();
      return true;
    });
    return () => handler.remove();
  }, [visible]);

  if (!visible) return null;

  // Handle bar colors adapt to tint
  const barWideColor = isDark ? 'rgba(90,70,30,0.5)' : 'rgba(255,255,255,0.4)';
  const barNarrowColor = isDark ? 'rgba(90,70,30,0.3)' : 'rgba(255,255,255,0.22)';
  const chevronColor = isDark ? 'rgba(90,70,30,0.5)' : 'rgba(255,255,255,0.4)';
  const bandColors = isDark
    ? ['rgba(140,115,60,0.3)', 'transparent']
    : ['rgba(255,255,255,0.08)', 'transparent'];

  return (
    <View style={styles.absoluteOverlay}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={animateAndClose} />
        <Animated.View style={[styles.sheet, sheetStyle, panelStyle]}>
          <GestureDetector gesture={panGesture}>
            <LinearGradient colors={bandColors} style={styles.handleBand}>
              <DragHandle light={!isDark} />
            </LinearGradient>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    width: SCREEN_WIDTH * 0.88,
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  handleBand: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 4,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
  },
  handleBarWide: {
    width: 60,
    height: 5,
    borderRadius: 3,
  },
  handleBarNarrow: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
