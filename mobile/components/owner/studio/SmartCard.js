import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT } from '../../../constants/layout';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * SmartCard — glassmorphic collapsible card for the Magic Listing Studio.
 *
 * Props:
 *   title       — card heading (e.g., "Property Address")
 *   icon        — Ionicons name (e.g., "location")
 *   completion  — 'empty' | 'partial' | 'complete'
 *   defaultOpen — start expanded (default: false)
 *   error       — show red border (validation failed)
 *   cardRef     — ref callback for scroll-to-card
 *   children    — card content (rendered when expanded)
 */
export default function SmartCard({
  title,
  icon,
  completion = 'empty',
  defaultOpen = false,
  error = false,
  cardRef,
  children,
}) {
  const [expanded, setExpanded] = useState(defaultOpen);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(
      250,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ));
    setExpanded(prev => !prev);
  }, []);

  const badgeColor = completion === 'complete'
    ? COLORS.success
    : completion === 'partial'
      ? COLORS.brandOrange
      : COLORS.slate;

  const badgeIcon = completion === 'complete'
    ? 'checkmark-circle'
    : completion === 'partial'
      ? 'ellipse'
      : 'ellipse-outline';

  return (
    <View
      ref={cardRef}
      style={[styles.wrapper, error && styles.wrapperError]}
    >
      <BlurView
        intensity={expanded ? 30 : 15}
        tint="dark"
        style={styles.blurContainer}
      >
        {/* Internal highlight gradient for glass effect */}
        <LinearGradient
          colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Header — always visible */}
        <Pressable style={styles.header} onPress={toggle} hitSlop={8}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, expanded && styles.iconCircleActive]}>
              <Ionicons name={icon} size={18} color={expanded ? COLORS.white : COLORS.textSecondary} />
            </View>
            <Text style={[styles.title, expanded && styles.titleActive]}>{title}</Text>
          </View>
          <View style={styles.headerRight}>
            <Ionicons name={badgeIcon} size={18} color={badgeColor} />
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textSecondary}
              style={{ marginLeft: 8 }}
            />
          </View>
        </Pressable>

        {/* Content — only when expanded */}
        {expanded && (
          <View style={styles.content}>
            {children}
          </View>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(52,100,160,0.4)',
  },
  wrapperError: {
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  blurContainer: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 14,
    minHeight: 52,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleActive: {
    backgroundColor: COLORS.accent + '33',
  },
  title: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    flex: 1,
  },
  titleActive: {
    color: COLORS.text,
  },
  content: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.md,
  },
});
