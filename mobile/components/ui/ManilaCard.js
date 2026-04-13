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

import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import DragHandle from './DragHandle';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const { width: SCREEN_W } = Dimensions.get('window');
const DEFAULT_WIDTH = SCREEN_W - 24; // 12px margin each side
const TAB_HEIGHT = 37;
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
    // right (default) — offset 20px from edge
    tabRight = width - r - 20;
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
  tabWidth = 160,
  children,
  style,
  minBodyHeight = 200,
}) {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const cardWidth = DEFAULT_WIDTH;
  const bodyHeight = Math.max(minBodyHeight, measuredHeight + 30); // +30 for drag handle + padding
  const totalHeight = TAB_HEIGHT + bodyHeight;

  // Tab label position
  let tabLeft;
  if (tabAlign === 'left') {
    tabLeft = BODY_RADIUS;
  } else if (tabAlign === 'center') {
    tabLeft = (cardWidth - tabWidth) / 2;
  } else {
    tabLeft = cardWidth - BODY_RADIUS - tabWidth - 20;
  }

  const path = buildFolderPath(cardWidth, bodyHeight, tabWidth, tabAlign);

  return (
    <View style={[styles.container, { width: cardWidth, height: totalHeight }, style]}>
      {/* SVG folder shape with gradient fill */}
      <Svg width={cardWidth} height={totalHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Main manila gradient — warm parchment */}
          <SvgGradient id="manilaGrad" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor="#E2D0A0" />
            <Stop offset="0.15" stopColor="#DECA92" />
            <Stop offset="0.35" stopColor="#E8D8A4" />
            <Stop offset="0.55" stopColor="#D8C88E" />
            <Stop offset="0.75" stopColor="#C4AD78" />
            <Stop offset="1" stopColor="#A89050" />
          </SvgGradient>
          {/* Top-left light source — diagonal highlight */}
          <SvgGradient id="lightSource" x1="0" y1="0" x2="0.5" y2="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
            <Stop offset="0.3" stopColor="#FFFFFF" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </SvgGradient>
          {/* Bottom-right shadow — away from light */}
          <SvgGradient id="bottomShadow" x1="0.5" y1="0.6" x2="1" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.7" stopColor="#000000" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.12" />
          </SvgGradient>
          {/* Tab shadow — tab casts shadow on body */}
          <SvgGradient id="tabShadow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.1" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </SvgGradient>
        </Defs>

        {/* Outer drop shadow (offset behind) */}
        <Path
          d={path}
          fill="rgba(0,0,0,0.18)"
          transform="translate(2, 4)"
        />
        <Path
          d={path}
          fill="rgba(0,0,0,0.08)"
          transform="translate(1, 2)"
        />

        {/* Main folder shape */}
        <Path d={path} fill="url(#manilaGrad)" />

        {/* Diagonal light source highlight (top-left) */}
        <Path d={path} fill="url(#lightSource)" />

        {/* Bottom-right shadow (depth) */}
        <Path d={path} fill="url(#bottomShadow)" />

        {/* Tab shadow on body — horizontal strip below tab junction */}
        <Rect
          x={tabLeft - 5}
          y={TAB_HEIGHT}
          width={tabWidth + 10}
          height={8}
          fill="url(#tabShadow)"
          clipPath="url(#manilaClip)"
        />

        {/* Fold line — subtle horizontal crease for realism */}
        <Line
          x1={16}
          y1={TAB_HEIGHT + totalHeight * 0.35}
          x2={cardWidth - 16}
          y2={TAB_HEIGHT + totalHeight * 0.35}
          stroke="rgba(120,100,60,0.12)"
          strokeWidth="1"
        />
        {/* Fold highlight — bright line just above the crease */}
        <Line
          x1={16}
          y1={TAB_HEIGHT + totalHeight * 0.35 - 1}
          x2={cardWidth - 16}
          y2={TAB_HEIGHT + totalHeight * 0.35 - 1}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />

        {/* Top-left edge highlight — light catching the edge */}
        <Path
          d={path}
          fill="none"
          stroke="rgba(255,245,220,0.35)"
          strokeWidth="1.5"
        />
        {/* Outer definition stroke — darker */}
        <Path
          d={path}
          fill="none"
          stroke="rgba(140,115,60,0.25)"
          strokeWidth="0.5"
        />
      </Svg>

      {/* Tab label — white sticker on the tab */}
      <View style={[styles.tabLabel, { left: tabLeft, width: tabWidth }]}>
        <View style={styles.labelSticker}>
          <Text style={styles.tabText}>{label}</Text>
        </View>
      </View>

      {/* Drag handle — at junction of tab and body */}
      <View style={[styles.dragHandleWrap]}>
        <DragHandle />
      </View>

      {/* Body content — below drag handle, auto-measured */}
      <View
        style={styles.bodyContent}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - measuredHeight) > 5) setMeasuredHeight(h);
        }}
      >
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
    top: 3,
    height: TAB_HEIGHT - 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelSticker: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tabText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xxs,
    color: '#3A2E14',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dragHandleWrap: {
    marginTop: TAB_HEIGHT + 6,
  },
  bodyContent: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: 0,
    paddingBottom: LAYOUT.padding.md,
  },
});
