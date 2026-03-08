import { StyleSheet, Platform } from 'react-native';
import { COLORS } from './colors';
import { FONTS, FONT_SIZES } from './fonts';
import { LAYOUT } from './layout';

// ── Tab bar ────────────────────────────────────────────────
// Shared screenOptions object — spread into every <Tabs> layout.
export const TAB_SCREEN_OPTIONS = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabBarActiveTintColor: COLORS.accent,
  tabBarInactiveTintColor: COLORS.white,
  tabBarLabelStyle: {
    fontFamily: FONTS.body.medium,
    fontSize: 13,
  },
};

// Tab icon size — keeps every tab bar icon uniform.
export const TAB_ICON_SIZE = 26;

// ── Reusable screen styles ─────────────────────────────────
export const SCREEN = StyleSheet.create({
  // Full-screen container with padding (profile, services, etc.)
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: LAYOUT.padding.md,
  },
  // Full-screen container without padding (lists, messages, etc.)
  containerFlush: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Centered spinner container
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Standard page header text
  pageTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.md,
  },
  // Page header for flush containers (needs its own padding)
  pageTitleFlush: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
});

// ── Menu items (profile screens, settings) ─────────────────
export const MENU = StyleSheet.create({
  item: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

// ── Sign-out button ────────────────────────────────────────
export const SIGN_OUT = StyleSheet.create({
  button: {
    marginTop: 'auto',
    padding: LAYOUT.padding.md,
    alignItems: 'center',
  },
  text: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.danger,
  },
});
