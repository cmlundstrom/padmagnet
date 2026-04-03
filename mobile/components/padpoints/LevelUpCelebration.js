import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Level Up Celebration — fullscreen overlay with confetti-like animation.
 * Shows when user reaches a new PadLevel.
 * Auto-dismisses after ~3 seconds.
 */
export default function LevelUpCelebration({ visible, level, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShowModal(true);

    // Celebration haptic pattern: success + delayed impact + delayed impact
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);

    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 4 seconds with 3-second fade out
    const timer = setTimeout(() => {
      Animated.timing(opacityAnim, { toValue: 0, duration: 3000, useNativeDriver: true }).start(() => {
        scaleAnim.setValue(0.3);
        setShowModal(false);
        onDismiss?.();
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!showModal || !level) return null;

  const levelColor = level.level >= 4 ? COLORS.gold :
                     level.level >= 3 ? COLORS.brandOrange :
                     level.level >= 2 ? COLORS.success : COLORS.accent;

  const PERKS = {
    2: '2nd Search Zone',
    3: '3rd Search Zone + Priority Refresh',
    4: '4th Search Zone + Owner-Visible Badge',
    5: 'All Perks + Pad Master Crown',
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.celebration}>🎉</Text>
          <Text style={styles.title}>PADLEVEL UP!</Text>
          <Text style={[styles.levelName, { color: levelColor }]}>
            ⭐ {level.name} ⭐
          </Text>
          <Text style={styles.levelNumber}>Level {level.level}</Text>

          {PERKS[level.level] && (
            <View style={styles.perkRow}>
              <Text style={styles.perkIcon}>🔓</Text>
              <Text style={styles.perkText}>Unlocked: {PERKS[level.level]}</Text>
            </View>
          )}

          <Text style={styles.hint}>Keep swiping to level up!</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.scrimDarker,
    justifyContent: 'center',
    alignItems: 'center',
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
