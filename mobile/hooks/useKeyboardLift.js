// Global keyboard-lift hook — single source of truth for how overlays react
// to the soft keyboard. Two modes:
//
//   mode: 'sheet'  → Rule A. For bottom-anchored overlays (manila folder,
//                    chat input, any content at flex-end). Lift by the
//                    keyboard height minus a 45px peek so the overlay sits
//                    just above the keyboard with breathing room.
//
//   mode: 'popup'  → Rule B. For center-anchored overlays (confirm dialogs,
//                    price edit, magic-link prompt). Re-centers the overlay
//                    inside the visible area above the keyboard, then drops
//                    35px so the primary CTA lands closer to the thumb.
//
// Returns an animated style you apply to the overlay (or any ancestor whose
// transform propagates to it). Works on Android where endCoordinates.height
// is unreliable because of adjustResize — falls back to Dimensions diff.
//
// Reference implementations: AuthBottomSheet.js, PriceEditModal.js.
// Memory: feedback_keyboard_lift_modal.md.

import { useEffect } from 'react';
import { Platform, Keyboard, Dimensions } from 'react-native';
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const SHEET_PEEK_PX = 45;
const POPUP_NUDGE_DOWN_PX = 35;
const LIFT_DURATION_MS = 250;
const DROP_DURATION_MS = 200;
const FALLBACK_KB_HEIGHT_PX = 320;

function resolveKeyboardHeight(evt) {
  const reported = evt?.endCoordinates?.height || 0;
  if (reported > 0) return reported;
  const diff = Dimensions.get('screen').height - Dimensions.get('window').height;
  return diff > 0 ? diff : FALLBACK_KB_HEIGHT_PX;
}

export default function useKeyboardLift(mode = 'sheet') {
  const offset = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const kb = resolveKeyboardHeight(e);
      const target = mode === 'popup'
        ? -(kb / 2 - POPUP_NUDGE_DOWN_PX)
        : -(kb - SHEET_PEEK_PX);
      offset.value = withTiming(target, { duration: LIFT_DURATION_MS });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      offset.value = withTiming(0, { duration: DROP_DURATION_MS });
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, [mode]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return { style, offset };
}
