import { useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;

/**
 * Swipeable bottom sheet wrapper — drop-in replacement for Modal sheets.
 * Swipe the handle down to dismiss, tap backdrop to dismiss, or use onClose.
 *
 * Props:
 *   visible     — boolean, controls visibility
 *   onClose     — called when dismissed (swipe, backdrop tap, or back button)
 *   children    — sheet content (rendered inside the animated panel)
 *   sheetStyle  — optional additional styles for the sheet container
 */
export default function SwipeableSheet({ visible, onClose, children, sheetStyle }) {
  const translateY = useSharedValue(SCREEN_HEIGHT);

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

  if (!visible) return null;

  return (
    <Modal visible transparent statusBarTranslucent onRequestClose={animateAndClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={animateAndClose} />
        <Animated.View style={[styles.sheet, sheetStyle, panelStyle]}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#64748b',
  },
});
