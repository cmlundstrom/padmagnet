import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DragHandle from '../../ui/DragHandle';

const { height: SCREEN_H } = Dimensions.get('window');
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT } from '../../../constants/layout';

/**
 * StudioOnboardingTooltip — shown once on first studio visit.
 * Uses manila folder card style (no tab) for visual consistency.
 * Dismissed with a tap.
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
        <Animated.View style={{ transform: [{ translateY: slideY }] }}>
        <LinearGradient
          colors={['#C4AD78', '#DECA92', '#E8D8A4', '#D8C88E', '#BEA66A', '#A08040']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.74, y: 1 }}
          style={styles.card}
        >
          {/* Internal highlight for paper texture */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          <DragHandle />
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Welcome to the Listing Studio</Text>
            <View style={styles.headerAiRow}>
              <Text style={styles.headerAiText}>Featuring AI assistance from</Text>
              <Image
                source={require('../../../assets/images/askpad-orb.png')}
                style={styles.orbInline}
                contentFit="contain"
              />
            </View>
          </View>

          <View style={styles.tipRow}>
            <Text style={styles.bullet}>{'\u2726'}</Text>
            <Text style={styles.tipText}>Tap any card to expand it and fill in your listing details.</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.bullet}>{'\u2726'}</Text>
            <Text style={styles.tipText}>Use the sparkle buttons to let <Text style={styles.askWord}>Ask</Text><Text style={styles.padWord}>Pad</Text> write property descriptions and suggest amenities from your photos.</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.bullet}>{'\u2726'}</Text>
            <Text style={styles.tipText}>Tap Preview anytime to see your listing as renters will.</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.bullet}>{'\u2726'}</Text>
            <Text style={styles.tipText}>Your progress saves automatically. Come back anytime!</Text>
          </View>

          <Pressable style={styles.gotItBtn} onPress={handleDismiss}>
            <LinearGradient
              colors={['#F97316', COLORS.logoOrange, '#DC5A2C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gotItGradient}
            >
              <Text style={styles.gotItText}>Got it</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
        </Animated.View>
      </BlurView>
    </Animated.View>
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
  card: {
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: '#3D2E0A',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerAiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerAiText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: '#5C4A1E',
  },
  orbInline: {
    width: 26,
    height: 26,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    width: '100%',
  },
  bullet: {
    fontSize: 14,
    color: COLORS.logoOrange,
    marginTop: 2,
  },
  tipText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: '#4A3A14',
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
  gotItBtn: {
    marginTop: 16,
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gotItGradient: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    alignItems: 'center',
  },
  gotItText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    letterSpacing: 0.2,
  },
});
