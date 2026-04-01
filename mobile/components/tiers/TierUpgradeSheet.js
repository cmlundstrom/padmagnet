import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import VerifiedBadge from '../ui/VerifiedBadge';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Tier Upgrade Bottom Sheet — purchase AskPad Explorer or Pad Master.
 * Explorer shows both "Pay $1.50" and "Earn with 350 PadPoints" options.
 * Master shows "Pay $3.50 + Get Verified" only.
 */
export default function TierUpgradeSheet({ visible, onClose, currentTier, padpoints, onBuyExplorer, onBuyMaster, onRedeemExplorer }) {
  const canRedeem = (padpoints || 0) >= 350;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Upgrade AskPad</Text>
          <Text style={styles.subtitle}>More queries, more zones, better matches</Text>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* AskPad Explorer tier */}
          {currentTier === 'free' && (
            <View style={styles.tierBox}>
              <View style={styles.tierHeader}>
                <View style={styles.tierOrb}>
                  <Text style={styles.tierOrbAsk}>Ask</Text>
                  <Text style={styles.tierOrbPad}>Pad</Text>
                </View>
                <Text style={styles.tierName}>Pad Explorer</Text>
                <Text style={styles.tierPrice}>$1.50</Text>
              </View>
              <View style={styles.features}>
                <Text style={styles.feature}>✓ Add 30 AskPad queries per/day!{'\n'}✓ Add 2 geographic search zones</Text>
              </View>
              <TouchableOpacity style={styles.buyButton} onPress={function() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onBuyExplorer(); }} activeOpacity={0.8}>
                <Text style={styles.buyText}>Pay $1.50</Text>
              </TouchableOpacity>
              <Text style={styles.redeemHint}>
                Or, Swipe more to continue free use! You have earned {padpoints || 0}/350 PadPoints!
              </Text>
            </View>
          )}

          {/* Pad Master tier */}
          {currentTier !== 'master' && (
            <View style={[styles.tierBox, styles.tierBoxMaster]}>
              <View style={styles.tierHeader}>
                <View style={[styles.tierOrb, { backgroundColor: COLORS.gold }]}>
                  <Text style={[styles.tierOrbAsk, { color: COLORS.navy }]}>Ask</Text>
                  <Text style={[styles.tierOrbPad, { color: COLORS.navy }]}>Pad</Text>
                </View>
                <Text style={[styles.tierName, { color: COLORS.gold }]}>Pad Master</Text>
                <Text style={styles.tierPrice}>$3.50</Text>
              </View>
              <View style={styles.features}>
                <Text style={styles.feature}>✓ Unlimited AskPad queries</Text>
                <Text style={styles.feature}>✓ 3 search zones (maximum)</Text>
                <View style={styles.verifiedRow}>
                  <Text style={styles.feature}>✓ </Text>
                  <VerifiedBadge size="sm" />
                </View>
                <Text style={[styles.feature, { paddingLeft: 18 }]}>— owners see you're real!</Text>
              </View>
              <TouchableOpacity style={styles.masterButton} onPress={function() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onBuyMaster(); }} activeOpacity={0.8}>
                <Text style={styles.masterText}>Pay $3.50 + Get Verified</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.skipLink}>
            <Text style={styles.skipText}>Maybe later</Text>
          </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.scrimDark,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: LAYOUT.radius.xl,
    borderTopRightRadius: LAYOUT.radius.xl,
    paddingHorizontal: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding['2xl'],
    paddingTop: LAYOUT.padding.md,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: LAYOUT.padding.md,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.lg,
  },
  tierBox: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tierBoxMaster: {
    borderColor: COLORS.gold + '44',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: LAYOUT.padding.sm,
  },
  tierOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.white,
  },
  tierOrbAsk: {
    fontFamily: FONTS.heading.bold,
    fontSize: 7,
    color: COLORS.white,
    lineHeight: 9,
  },
  tierOrbPad: {
    fontFamily: FONTS.heading.bold,
    fontSize: 7,
    color: COLORS.brandOrange,
    lineHeight: 9,
  },
  tierName: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    flex: 1,
  },
  tierPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.success,
  },
  features: {
    marginBottom: LAYOUT.padding.sm,
    gap: 0,
  },
  feature: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  buyText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  redeemButton: {
    backgroundColor: COLORS.success + '15',
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success + '44',
  },
  redeemButtonDisabled: {
    backgroundColor: COLORS.frostedGlass,
    borderColor: COLORS.border,
  },
  redeemText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  redeemHint: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
    textAlign: 'center',
    marginTop: LAYOUT.padding.sm,
    lineHeight: 17,
  },
  redeemTextDisabled: {
    color: COLORS.slate,
  },
  masterButton: {
    backgroundColor: COLORS.gold,
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  masterText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.black,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.md,
  },
  skipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
  },
});
