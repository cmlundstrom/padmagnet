// FeatureBar — three columns of brand value-props on the welcome splash:
//
//   ✓ Free to use     → For renters and owners
//   ⚡ AI-powered      → Smarter rental search and better matches
//   🎯 PadScore™       → Every rental scored against your preferences
//
// Each column is tappable. Tap opens a centered modal tooltip with the
// expanded explanation + a Got it dismiss. Stateless — every tap shows
// the tooltip fresh, no AsyncStorage tracking, always re-tappable.
//
// Visual: short title under icon, 2-line subtitle below, vertical
// dividers between columns. Subtle dark container background.

import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const ASKPAD_ORB = require('../../assets/images/askpad-orb.png');

const FEATURES = [
  {
    key: 'free',
    icon: 'checkmark-circle',
    iconColor: COLORS.success,
    iconBg: COLORS.success + '22',
    title: 'Free to use',
    subtitle: 'For renters\nand owners',
    tooltipTitle: 'Free for everyone',
    tooltipBody:
      'Renters never pay PadMagnet — discovering your next home is always free. Owners post their first listing free for 30 days; upgrades unlock more visibility but listing itself stays free.',
  },
  {
    key: 'ai',
    customIcon: ASKPAD_ORB, // AskPad orb — overrides Ionicon when present
    iconColor: COLORS.accent,
    iconBg: 'transparent', // orb is self-contained, skip the tinted disc
    title: 'AI-powered',
    subtitle: 'Smarter\nsearch',
    tooltipTitle: 'Smarter rental search',
    tooltipBody:
      'AskPad — your built-in AI co-pilot — learns what matters to you (budget, neighborhood, must-haves, dealbreakers) and surfaces the listings most likely to be a real match. No spam, no scraping, no fake leads.',
  },
  {
    key: 'padscore',
    icon: 'aperture',
    iconColor: '#A78BFA',
    iconBg: '#A78BFA22',
    title: 'PadScore™',
    subtitle: 'Every rental\nscored',
    tooltipTitle: 'PadScore™ explained',
    tooltipBody:
      'Every listing is scored 0–100 against your saved preferences. Higher PadScore = stronger match across location, price, beds, baths, features, and lease terms — so you can spot the gems instantly without scrolling through dozens of listings.',
  },
];

export default function FeatureBar() {
  const [openFeature, setOpenFeature] = useState(null);

  return (
    <>
      <View style={styles.container}>
        {FEATURES.map((f, i) => (
          <View key={f.key} style={styles.colWrap}>
            <Pressable
              onPress={() => setOpenFeature(f)}
              style={({ pressed }) => [styles.col, pressed && { opacity: 0.6 }]}
              hitSlop={6}
            >
              <View style={[styles.iconCircle, { backgroundColor: f.iconBg }]}>
                {f.customIcon ? (
                  <Image
                    source={f.customIcon}
                    style={styles.iconOrb}
                    contentFit="contain"
                  />
                ) : (
                  <Ionicons name={f.icon} size={20} color={f.iconColor} />
                )}
              </View>
              <Text style={styles.title}>{f.title}</Text>
              <Text style={styles.subtitle}>{f.subtitle}</Text>
            </Pressable>
            {i < FEATURES.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* Stateless tooltip modal — closes on backdrop tap or "Got it". No
          AsyncStorage persistence; every tap re-opens fresh. */}
      <Modal
        visible={!!openFeature}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenFeature(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpenFeature(null)}>
          <Pressable
            style={styles.tooltipCard}
            onPress={(e) => e.stopPropagation()}
          >
            {openFeature && (
              <>
                <View style={[styles.tooltipIcon, { backgroundColor: openFeature.iconBg }]}>
                  {openFeature.customIcon ? (
                    <Image
                      source={openFeature.customIcon}
                      style={styles.tooltipOrb}
                      contentFit="contain"
                    />
                  ) : (
                    <Ionicons
                      name={openFeature.icon}
                      size={28}
                      color={openFeature.iconColor}
                    />
                  )}
                </View>
                <Text style={styles.tooltipTitle}>{openFeature.tooltipTitle}</Text>
                <Text style={styles.tooltipBody}>{openFeature.tooltipBody}</Text>
                <Pressable
                  onPress={() => setOpenFeature(null)}
                  style={({ pressed }) => [
                    styles.gotItBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.gotItText}>Got it</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface + 'CC',
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: LAYOUT.padding.md,
    paddingHorizontal: LAYOUT.padding.sm,
    marginHorizontal: LAYOUT.padding.md,
    marginTop: LAYOUT.padding.sm,
  },
  colWrap: {
    flex: 1,
    flexDirection: 'row',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconOrb: {
    width: 38,
    height: 38,
  },
  title: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  // ── Tooltip modal ─────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
  },
  tooltipCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  tooltipIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  tooltipOrb: {
    width: 56,
    height: 56,
  },
  tooltipTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  tooltipBody: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: LAYOUT.padding.lg,
  },
  gotItBtn: {
    backgroundColor: COLORS.logoOrange,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: LAYOUT.radius.full,
  },
  gotItText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    letterSpacing: 0.4,
  },
});
