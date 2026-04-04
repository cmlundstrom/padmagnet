import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const VIEW_MODES = ['grid', 'map', 'list'];
const VIEW_ICONS = { grid: '\u25a3', map: '\u25ce', list: '\u2630' };

/**
 * Shared branded header for all owner tab screens.
 *
 * - Refresh button (left) — calls onRefresh or navigates to Home
 * - PadMagnet wordmark (center-left)
 * - View toggle (right) — grid / map / list for nearby rentals
 *
 * @param {string} viewMode - current active view mode
 * @param {function} onViewModeChange - called when a view toggle is tapped (Home screen)
 * @param {function} onRefresh - called when refresh is tapped
 */
export default function OwnerHeader({ viewMode, onViewModeChange, onRefresh }) {
  const router = useRouter();
  const segments = useSegments();
  const isHome = segments[1] === 'home';

  function handleViewMode(mode) {
    if (isHome && onViewModeChange) {
      // On Home — switch view mode directly
      onViewModeChange(mode);
    } else {
      // On other tabs — navigate to Home with the selected view mode
      router.push({ pathname: '/(owner)/home', params: { view: mode } });
    }
  }

  function handleRefresh() {
    if (onRefresh) {
      onRefresh();
    } else if (!isHome) {
      router.push('/(owner)/home');
    }
  }

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Pressable style={styles.resetBtn} onPress={handleRefresh}>
          <FontAwesome name="refresh" size={16} color={COLORS.textSecondary} />
        </Pressable>
        <Text style={styles.logo}>
          <Text style={{ color: COLORS.white }}>Pad</Text>
          <Text style={{ color: COLORS.deepOrange }}>Magnet</Text>
        </Text>
      </View>
      <View style={styles.headerRight}>
        <View style={styles.viewToggle}>
          {VIEW_MODES.map(mode => (
            <Pressable
              key={mode}
              style={[
                styles.toggleButton,
                viewMode === mode && styles.toggleButtonActive,
              ]}
              onPress={() => handleViewMode(mode)}
            >
              <Text
                style={[
                  styles.toggleIcon,
                  viewMode === mode && styles.toggleIconActive,
                ]}
              >
                {VIEW_ICONS[mode]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
  },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.sm,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: LAYOUT.radius.sm - 2,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.card,
  },
  toggleIcon: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  toggleIconActive: {
    color: COLORS.accent,
  },
});
