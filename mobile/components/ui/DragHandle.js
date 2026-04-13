/**
 * Universal drag handle indicator — visual hint for swipe-to-dismiss.
 * Used on ALL overlay cards, sheets, and manila folders.
 *
 * Style: dual horizontal bars (wide + narrow) with subtle downward chevron.
 * Centered at top of card/sheet.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BAR_COLOR = 'rgba(180, 160, 120, 0.5)';
const CHEVRON_COLOR = 'rgba(180, 160, 120, 0.4)';

export default function DragHandle({ light = false }) {
  const barColor = light ? 'rgba(255,255,255,0.35)' : BAR_COLOR;
  const chevronColor = light ? 'rgba(255,255,255,0.25)' : CHEVRON_COLOR;

  return (
    <View style={styles.container}>
      <View style={[styles.barWide, { backgroundColor: barColor }]} />
      <View style={[styles.barNarrow, { backgroundColor: barColor }]} />
      <Ionicons name="chevron-down" size={12} color={chevronColor} style={{ marginTop: 2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  barWide: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  barNarrow: {
    width: 28,
    height: 3,
    borderRadius: 1.5,
  },
});
