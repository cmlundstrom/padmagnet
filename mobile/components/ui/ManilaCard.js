/**
 * ManilaCard — authentic manila folder with SVG tab outline.
 *
 * The tab is part of the folder's outline — one continuous SVG shape.
 * No separate tab element. The tab "grows" out of the top edge.
 * Includes integrated DragHandle at the junction.
 *
 * Props:
 *   label       - tab label text (e.g., "List For Free", "MESSAGES")
 *   tabAlign    - 'left' | 'right' | 'center' (default: 'right')
 *   tabWidth    - width of the tab notch (default: 140)
 *   children    - folder body content
 *   style       - additional style for outer container
 */

import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import DragHandle from './DragHandle';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const { width: SCREEN_W } = Dimensions.get('window');
const DEFAULT_WIDTH = SCREEN_W - 24; // 12px margin each side
const TAB_HEIGHT = 32;
const BODY_RADIUS = 14;
const TAB_RADIUS = 8;

/**
 * Build the SVG path for a manila folder with an integrated tab.
 * One continuous path — no seam between tab and body.
 */
function buildFolderPath(width, bodyHeight, tabWidth, tabAlign) {
  const totalHeight = TAB_HEIGHT + bodyHeight;
  const r = BODY_RADIUS;
  const tr = TAB_RADIUS;

  // Calculate tab position
  let tabLeft, tabRight;
  if (tabAlign === 'left') {
    tabLeft = r;
    tabRight = tabLeft + tabWidth;
  } else if (tabAlign === 'center') {
    tabLeft = (width - tabWidth) / 2;
    tabRight = tabLeft + tabWidth;
  } else {
    // right (default)
    tabRight = width - r;
    tabLeft = tabRight - tabWidth;
  }

  // Path: start at top-left of body, go up into tab, across, back down, continue body
  return `
    M ${r} ${TAB_HEIGHT}
    L ${tabLeft - tr} ${TAB_HEIGHT}
    Q ${tabLeft} ${TAB_HEIGHT} ${tabLeft} ${TAB_HEIGHT - tr}
    L ${tabLeft} ${tr}
    Q ${tabLeft} 0 ${tabLeft + tr} 0
    L ${tabRight - tr} 0
    Q ${tabRight} 0 ${tabRight} ${tr}
    L ${tabRight} ${TAB_HEIGHT - tr}
    Q ${tabRight} ${TAB_HEIGHT} ${tabRight + tr} ${TAB_HEIGHT}
    L ${width - r} ${TAB_HEIGHT}
    Q ${width} ${TAB_HEIGHT} ${width} ${TAB_HEIGHT + r}
    L ${width} ${totalHeight - r}
    Q ${width} ${totalHeight} ${width - r} ${totalHeight}
    L ${r} ${totalHeight}
    Q 0 ${totalHeight} 0 ${totalHeight - r}
    L 0 ${TAB_HEIGHT + r}
    Q 0 ${TAB_HEIGHT} ${r} ${TAB_HEIGHT}
    Z
  `;
}

export default function ManilaCard({
  label,
  tabAlign = 'right',
  tabWidth = 140,
  children,
  style,
  bodyHeight = 500,
}) {
  const cardWidth = DEFAULT_WIDTH;
  const totalHeight = TAB_HEIGHT + bodyHeight;

  // Tab label position
  let tabLeft;
  if (tabAlign === 'left') {
    tabLeft = BODY_RADIUS;
  } else if (tabAlign === 'center') {
    tabLeft = (cardWidth - tabWidth) / 2;
  } else {
    tabLeft = cardWidth - BODY_RADIUS - tabWidth;
  }

  const path = buildFolderPath(cardWidth, bodyHeight, tabWidth, tabAlign);

  return (
    <View style={[styles.container, { width: cardWidth, height: totalHeight }, style]}>
      {/* SVG folder shape with gradient fill */}
      <Svg width={cardWidth} height={totalHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Main manila gradient */}
          <SvgGradient id="manilaGrad" x1="0" y1="0" x2="0.74" y2="1">
            <Stop offset="0" stopColor="#D4BE8A" />
            <Stop offset="0.2" stopColor="#DECA92" />
            <Stop offset="0.4" stopColor="#E8D8A4" />
            <Stop offset="0.6" stopColor="#D8C88E" />
            <Stop offset="0.8" stopColor="#C4AD78" />
            <Stop offset="1" stopColor="#A89050" />
          </SvgGradient>
          {/* Subtle inner shadow gradient for 3D depth */}
          <SvgGradient id="innerShadow" x1="0" y1="0" x2="0" y2="0.08">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </SvgGradient>
          {/* Top sheen for 3D highlight */}
          <SvgGradient id="topSheen" x1="0" y1="0" x2="0" y2="0.15">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.15" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </SvgGradient>
        </Defs>

        {/* Outer shadow (slightly offset darker shape behind) */}
        <Path
          d={path}
          fill="rgba(0,0,0,0.2)"
          transform="translate(0, 3)"
        />

        {/* Main folder shape */}
        <Path d={path} fill="url(#manilaGrad)" />

        {/* 3D depth: inner shadow at top */}
        <Path d={path} fill="url(#innerShadow)" />

        {/* 3D highlight: top sheen */}
        <Path d={path} fill="url(#topSheen)" />

        {/* Subtle edge line for definition */}
        <Path
          d={path}
          fill="none"
          stroke="rgba(160,128,64,0.3)"
          strokeWidth="1"
        />
      </Svg>

      {/* Tab label — positioned over the SVG tab area */}
      <View style={[styles.tabLabel, { left: tabLeft, width: tabWidth }]}>
        <Text style={styles.tabText}>{label}</Text>
      </View>

      {/* Drag handle — at junction of tab and body */}
      <View style={[styles.dragHandleWrap]}>
        <DragHandle />
      </View>

      {/* Body content — below drag handle */}
      <View style={styles.bodyContent}>
        {children}
      </View>
    </View>
  );
}

/** Export for consistent use */
ManilaCard.TAB_HEIGHT = TAB_HEIGHT;
ManilaCard.BODY_RADIUS = BODY_RADIUS;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    // Drop shadow for the whole card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  tabLabel: {
    position: 'absolute',
    top: 4,
    height: TAB_HEIGHT - 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
    color: '#3A2E14',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dragHandleWrap: {
    marginTop: TAB_HEIGHT - 4,
  },
  bodyContent: {
    paddingHorizontal: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding.lg,
  },
});
