// Shared tab bar style for the tenant and owner bottom-tab layouts.
// Reads the OS-reported bottom safe-area inset (gesture zone / home
// indicator height) and adds explicit breathing room so labels never
// sit flush against the system bar. Single source of truth — tune
// the base height or padding in one place and both tab groups follow.

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_TAB_HEIGHT = 60;        // space for icon + label + vertical breathing
const LABEL_BREATHING_PX = 6;      // explicit padding above the system gesture zone
const ICON_BREATHING_PX = 6;       // symmetrical padding above the icons

export default function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  return {
    backgroundColor: '#0B1D3A',
    borderTopWidth: 0,
    elevation: 0,
    height: BASE_TAB_HEIGHT + insets.bottom,
    paddingBottom: insets.bottom + LABEL_BREATHING_PX,
    paddingTop: ICON_BREATHING_PX,
  };
}
