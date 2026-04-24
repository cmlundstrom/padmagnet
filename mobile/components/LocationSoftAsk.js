import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import DragHandle from './ui/DragHandle';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

const RING_COUNT = 3;
const RING_DURATION = 2400;

function RadarRing({ delay }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: RING_DURATION, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 2.8]) }],
    opacity: interpolate(progress.value, [0, 0.3, 1], [0.5, 0.3, 0]),
  }));

  return <Animated.View style={[styles.radarRing, style]} />;
}

function BenefitRow({ icon, text }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <FontAwesome name={icon} size={13} color={COLORS.accent} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

export default function LocationSoftAsk({ onEnable, onSkip }) {
  // Defer to next tick so the press animation commits before the parent's
  // callback swaps the screen. Previously used InteractionManager, now
  // deprecated — setTimeout(..., 0) has equivalent scheduling semantics.
  const handleEnable = () => {
    setTimeout(() => onEnable(), 0);
  };
  const handleSkip = () => {
    setTimeout(() => onSkip(), 0);
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.overlay}>
        <View style={styles.cardOuter}>
          <LinearGradient
            colors={['#1E4976', '#234170', '#1A3358']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.card}
          >
            <DragHandle light />

            {/* Radar icon */}
            <View style={styles.iconContainer}>
              {Array.from({ length: RING_COUNT }).map((_, i) => (
                <RadarRing key={i} delay={i * (RING_DURATION / RING_COUNT)} />
              ))}
              <LinearGradient
                colors={[COLORS.accent, '#2563EB']}
                style={styles.iconCircle}
              >
                <FontAwesome name="map-marker" size={32} color={COLORS.white} />
              </LinearGradient>
            </View>

            {/* Heading */}
            <Text style={styles.heading}>
              Find your next home{'\n'}
              <Text style={styles.headingHighlight}>right where you are</Text>
            </Text>

            {/* Benefits */}
            <View style={styles.benefits}>
              <BenefitRow icon="crosshairs" text="Listings nearest to you appear first" />
              <BenefitRow icon="star" text="PadScore boosts for nearby matches" />
              <BenefitRow icon="shield" text="Your location is never shared" />
            </View>

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [styles.enableButton, pressed && { opacity: 0.85 }]}
              onPress={handleEnable}
            >
              <LinearGradient
                colors={['#F97316', COLORS.logoOrange, '#DC5A2C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.enableGradient}
              >
                <FontAwesome
                  name="location-arrow"
                  size={17}
                  color={COLORS.white}
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.enableText}>Enable Location</Text>
              </LinearGradient>
            </Pressable>

            {/* Skip */}
            <Pressable
              style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.7 }]}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>I'll search manually</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.scrimDarkest,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 100,
  },
  cardOuter: {
    width: LAYOUT.card.width,
    borderRadius: LAYOUT.radius.lg,
    // Outer glow shadow
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    paddingTop: LAYOUT.padding.xl,
    paddingBottom: LAYOUT.padding.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
    overflow: 'hidden',
  },
  // ── Radar icon ───────────────────────────────────
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.padding.lg,
  },
  radarRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: LAYOUT.radius.full,
    borderWidth: 2,
    borderColor: COLORS.accent + '55',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: LAYOUT.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Typography ───────────────────────────────────
  heading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: LAYOUT.padding.lg,
  },
  headingHighlight: {
    color: COLORS.brandOrange,
  },
  // ── Benefits ─────────────────────────────────────
  benefits: {
    width: '100%',
    gap: 14,
    marginBottom: LAYOUT.padding.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.accent + '1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  // ── CTA ──────────────────────────────────────────
  enableButton: {
    borderRadius: LAYOUT.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    borderLeftColor: 'rgba(255,255,255,0.10)',
    borderRightColor: 'rgba(0,0,0,0.08)',
    borderBottomColor: 'rgba(0,0,0,0.15)',
    // Warm orange glow
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  enableGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    paddingHorizontal: LAYOUT.padding.xl,
  },
  enableText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  // ── Skip ─────────────────────────────────────────
  skipButton: {
    paddingVertical: LAYOUT.padding.md,
    paddingHorizontal: LAYOUT.padding.lg,
  },
  skipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
