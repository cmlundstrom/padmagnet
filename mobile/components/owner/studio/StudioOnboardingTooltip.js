import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import DragHandle from '../../ui/DragHandle';

const { height: SCREEN_H } = Dimensions.get('window');
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT } from '../../../constants/layout';

/**
 * StudioOnboardingTooltip — shown once on first studio visit.
 * Manila folder aesthetic: tabbed sticker, aged-paper body, brass corner
 * pins, hero AskPad orb with warm halo, ornamental edge highlights.
 * This is the "last chance to sell the Studio" surface — built heavy.
 *
 * Props:
 *   visible   — boolean
 *   onDismiss — called when user taps "Got it"
 */
export default function StudioOnboardingTooltip({ visible, onDismiss }) {
  const slideY = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  if (!visible) return null;

  function handleDismiss() {
    Animated.parallel([
      Animated.timing(slideY, { toValue: SCREEN_H * 0.6, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeOut, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeOut }]}>
      <BlurView intensity={40} tint="dark" style={styles.blur}>
        <Animated.View style={[styles.cardWrap, { transform: [{ translateY: slideY }] }]}>

          {/* Manila tab sticker — ties this surface into the folder family */}
          <View style={styles.tabWrap}>
            <LinearGradient
              colors={['#E8D8A4', '#D8C88E', '#BEA66A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.tab}
            >
              <View style={styles.tabSticker}>
                <Text style={styles.tabText}>STUDIO</Text>
              </View>
            </LinearGradient>
          </View>

          <LinearGradient
            colors={['#C4AD78', '#DECA92', '#E8D8A4', '#D8C88E', '#BEA66A', '#A08040']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.74, y: 1 }}
            style={styles.card}
          >
            {/* Cross-grain paper texture sweep */}
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.12)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {/* Top edge highlight */}
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.topEdgeHighlight}
              pointerEvents="none"
            />
            {/* Bottom edge darkening */}
            <LinearGradient
              colors={['transparent', 'rgba(60,40,10,0.2)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.bottomEdgeDarken}
              pointerEvents="none"
            />
            {/* Inner border — subtle definition line inside the card */}
            <View style={styles.innerBorder} pointerEvents="none" />

            {/* Brass corner pins — four stamped rivets, steampunk accent */}
            <BrassPin style={styles.pinTopLeft} />
            <BrassPin style={styles.pinTopRight} />
            <BrassPin style={styles.pinBottomLeft} />
            <BrassPin style={styles.pinBottomRight} />

            <DragHandle />

            {/* Hero AskPad orb — warm radial halo behind */}
            <View style={styles.heroWrap}>
              <View style={styles.heroHalo} pointerEvents="none" />
              <View style={styles.heroHaloInner} pointerEvents="none" />
              <Image
                source={require('../../../assets/images/askpad-orb.png')}
                style={styles.heroOrb}
                contentFit="contain"
              />
            </View>

            <Text style={styles.title}>Your Property, Your Story</Text>
            <Text style={styles.subtitle}>
              Let <Text style={styles.askWord}>Ask</Text><Text style={styles.padWord}>Pad</Text> help you tell it.
            </Text>

            {/* Ornamental divider — small brass filigree */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerDot}>{'✦'}</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.tipRow}>
              <Text style={styles.bullet}>{'✦'}</Text>
              <Text style={styles.tipText}>Tap any card to expand it and fill in your listing details.</Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.bullet}>{'✦'}</Text>
              <Text style={styles.tipText}>Hit the sparkle on any card and <Text style={styles.askWord}>Ask</Text><Text style={styles.padWord}>Pad</Text> writes the copy and pulls amenities from your photos.</Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.bullet}>{'✦'}</Text>
              <Text style={styles.tipText}>Preview anytime to see your listing through a renter's eyes.</Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.bullet}>{'✦'}</Text>
              <Text style={styles.tipText}>Autosaves as you go. Come back whenever — we'll pick up where you left off.</Text>
            </View>

            <Pressable style={styles.gotItBtn} onPress={handleDismiss}>
              <LinearGradient
                colors={['#FF8C38', '#F97316', COLORS.logoOrange, '#DC5A2C', '#B84A1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gotItGradient}
              >
                {/* CTA top shine */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.gotItShine}
                  pointerEvents="none"
                />
                <Text style={styles.gotItText}>Let's Build It</Text>
                {/* Bottom edge darkening for 3D depth */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.18)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.gotItBottomEdge}
                  pointerEvents="none"
                />
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
}

function BrassPin({ style }) {
  return (
    <View style={[styles.pinBase, style]} pointerEvents="none">
      <LinearGradient
        colors={['#D4B66A', '#8B7035', '#5C4A1E']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.pinGradient}
      >
        <View style={styles.pinHighlight} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.padding.lg,
  },
  cardWrap: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 370,
  },

  // ── Tab sticker ──────────────────────────────
  tabWrap: {
    marginBottom: -1, // visually seats the tab on top of the folder
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  tab: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderWidth: 0.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  tabSticker: {
    backgroundColor: 'rgba(255,248,230,0.92)',
    borderRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(60,40,10,0.15)',
  },
  tabText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
    color: '#3A2810',
    letterSpacing: 2.5,
  },

  // ── Card body ────────────────────────────────
  card: {
    width: '100%',
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    paddingTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(60,40,10,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },
  innerBorder: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: LAYOUT.radius.lg - 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,248,230,0.35)',
  },
  topEdgeHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 10,
  },
  bottomEdgeDarken: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 12,
  },

  // ── Brass corner pins ────────────────────────
  pinBase: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 1.5,
    elevation: 2,
  },
  pinGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 4.5,
    borderWidth: 0.5,
    borderColor: 'rgba(60,40,10,0.35)',
  },
  pinHighlight: {
    position: 'absolute',
    top: 1.5,
    left: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,248,220,0.7)',
  },
  pinTopLeft:     { top: 12, left: 12 },
  pinTopRight:    { top: 12, right: 12 },
  pinBottomLeft:  { bottom: 12, left: 12 },
  pinBottomRight: { bottom: 12, right: 12 },

  // ── Hero orb ──────────────────────────────────
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 10,
    width: 96,
    height: 96,
  },
  heroHalo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,200,110,0.35)',
  },
  heroHaloInner: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,230,150,0.5)',
  },
  heroOrb: {
    width: 56,
    height: 56,
    zIndex: 1,
  },

  // ── Headline + subtitle ──────────────────────
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: '#3A2810',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255,248,220,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: '#5C4A1E',
    textAlign: 'center',
    marginBottom: 6,
  },

  // ── Ornamental divider ───────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
    width: '72%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(60,40,10,0.25)',
  },
  dividerDot: {
    fontSize: 14,
    color: COLORS.logoOrange,
  },

  // ── Tips ─────────────────────────────────────
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    width: '100%',
    paddingRight: 4,
  },
  bullet: {
    fontSize: 14,
    color: COLORS.logoOrange,
    marginTop: 1,
  },
  tipText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#3D2E0A',
    flex: 1,
    lineHeight: 20,
  },
  askWord: {
    fontFamily: FONTS.body.bold,
    color: COLORS.white,
  },
  padWord: {
    fontFamily: FONTS.body.bold,
    color: COLORS.brandOrange,
  },

  // ── "Let's Build It" CTA ─────────────────────
  gotItBtn: {
    marginTop: 18,
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,180,80,0.45)',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  gotItGradient: {
    paddingHorizontal: 44,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gotItShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
  },
  gotItBottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  gotItText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
