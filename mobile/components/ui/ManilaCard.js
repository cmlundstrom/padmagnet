/**
 * ManilaCard — reusable manila folder card with integrated tab notch.
 *
 * The tab is part of the folder body, not a separate element.
 * A small notch protrudes from the top edge with the label text.
 * Drag handle sits at the junction of tab and body.
 *
 * Props:
 *   label       - tab label text (e.g., "List For Free", "Account")
 *   tabAlign    - 'left' | 'right' | 'center' (default: 'right')
 *   children    - folder body content
 *   style       - additional style for outer container
 *   onTabPress  - optional tap handler for the tab area
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DragHandle from './DragHandle';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

// Manila gradient — warm aged parchment
const MANILA_COLORS = [
  '#C4AD78',
  '#DECA92',
  '#E8D8A4',
  '#D8C88E',
  '#BEA66A',
  '#A08040',
];

export default function ManilaCard({ label, tabAlign = 'right', children, style, onTabPress }) {
  const alignSelf = tabAlign === 'left' ? 'flex-start'
    : tabAlign === 'center' ? 'center'
    : 'flex-end';

  return (
    <View style={[styles.outerWrap, style]}>
      {/* Integrated tab notch — sits on top of body */}
      <Pressable
        style={[styles.tabNotch, { alignSelf }]}
        onPress={onTabPress}
        disabled={!onTabPress}
      >
        <LinearGradient
          colors={['#D4BA82', '#E8D8A4', '#DECA92']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tabGradient}
        >
          <Text style={styles.tabLabel}>{label}</Text>
        </LinearGradient>
      </Pressable>

      {/* Folder body — seamless with tab */}
      <LinearGradient
        colors={MANILA_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.74, y: 1 }}
        style={styles.body}
      >
        {/* Drag handle at top of body, right below tab junction */}
        <DragHandle />

        {/* Inner content area */}
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'transparent']}
          style={styles.innerSheen}
        >
          {children}
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

/** Export manila gradient colors for consistent use */
ManilaCard.COLORS = MANILA_COLORS;

const styles = StyleSheet.create({
  outerWrap: {
    // No gap between tab and body — seamless
  },
  tabNotch: {
    // Small notch protruding from body top
    marginBottom: -1, // overlap 1px to hide any seam
    zIndex: 1,
  },
  tabGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopLeftRadius: LAYOUT.radius.md,
    borderTopRightRadius: LAYOUT.radius.md,
    // No bottom radius — merges into body
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    // Subtle shadow for tab depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabLabel: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
    color: '#4A3A1A',
    letterSpacing: 0.3,
  },
  body: {
    borderRadius: LAYOUT.radius.lg,
    borderTopRightRadius: LAYOUT.radius.lg,
    borderTopLeftRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    // Drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  innerSheen: {
    paddingHorizontal: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding.lg,
  },
});
