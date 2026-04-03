import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Level Up Celebration — fullscreen overlay.
 * Shows when user reaches a new PadLevel.
 * 4 seconds visible + 3 second fade out.
 */
export default function LevelUpCelebration({ visible, level, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [showing, setShowing] = useState(false);
  const [frozenLevel, setFrozenLevel] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible && level && !showing) {
      // Latch — freeze the level data and show
      setFrozenLevel(level);
      setShowing(true);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.3);

      // Haptics
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);

      // Entrance
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss: 4s display + 3s fade
      timerRef.current = setTimeout(() => {
        Animated.timing(opacityAnim, { toValue: 0, duration: 3000, useNativeDriver: true }).start(() => {
          setShowing(false);
          setFrozenLevel(null);
          onDismiss?.();
        });
      }, 4000);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, level]);

  if (!showing || !frozenLevel) return null;

  const levelColor = frozenLevel.level >= 4 ? COLORS.gold :
                     frozenLevel.level >= 3 ? COLORS.brandOrange :
                     frozenLevel.level >= 2 ? COLORS.success : COLORS.accent;

  const PERKS = {
    2: '2nd Search Zone',
    3: '3rd Search Zone + Priority Refresh',
    4: '4th Search Zone + Owner-Visible Badge',
    5: 'All Perks + Pad Master Crown',
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.celebration}>🎉</Text>
        <Text style={styles.title}>PADLEVEL UP!</Text>
        <Text style={[styles.levelName, { color: levelColor }]}>
          ⭐ {frozenLevel.name} ⭐
        </Text>
        <Text style={styles.levelNumber}>Level {frozenLevel.level}</Text>

        {PERKS[frozenLevel.level] && (
          <View style={styles.perkRow}>
            <Text style={styles.perkIcon}>🔓</Text>
            <Text style={styles.perkText}>Unlocked: {PERKS[frozenLevel.level]}</Text>
          </View>
        )}

        <Text style={styles.hint}>Keep swiping to level up!</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.scrimDarker,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.xl,
    padding: 36,
    alignItems: 'center',
    width: 300,
    borderWidth: 2,
    borderColor: COLORS.gold + '44',
  },
  celebration: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: 8,
  },
  levelName: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    marginBottom: 4,
  },
  levelNumber: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  perkIcon: {
    fontSize: 16,
  },
  perkText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
