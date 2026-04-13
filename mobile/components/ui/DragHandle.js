/**
 * Universal drag handle indicator — visual hint for swipe-to-dismiss.
 * Used on ALL overlay cards, sheets, and manila folders.
 *
 * Style: dual horizontal bars (wide + narrow) with subtle downward chevron.
 * Centered at top of card/sheet.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BAR_COLOR = 'rgba(140, 115, 60, 0.4)';
const CHEVRON_COLOR = 'rgba(140, 115, 60, 0.45)';

export default function DragHandle({ light = false }) {
  const barColor = light ? 'rgba(255,255,255,0.45)' : BAR_COLOR;
  const chevronColor = light ? 'rgba(255,255,255,0.4)' : CHEVRON_COLOR;

  return (
    <View style={styles.container}>
      <View style={[styles.barWide, { backgroundColor: barColor }]} />
      <View style={[styles.barNarrow, { backgroundColor: barColor }]} />
      <Ionicons name="chevron-down" size={14} color={chevronColor} style={{ marginTop: 3 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  barWide: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginBottom: 3,
  },
  barNarrow: {
    width: 30,
    height: 3,
    borderRadius: 1.5,
  },
});
