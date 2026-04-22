import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import MessagesScreen from '../../components/screens/MessagesScreen';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import OwnerHeader from '../../components/owner/OwnerHeader';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OwnerMessages() {
  const { isAnon } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (isAnon) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <OwnerHeader minimal />
        <Text style={styles.header}>Messages</Text>

        <View style={styles.teaserCard}>
          <Ionicons name="chatbubbles" size={40} color={COLORS.accent} />
          <Text style={styles.teaserTitle}>Communicate effortlessly with renters</Text>

          <View style={styles.bridgeRow}>
            <View style={styles.bridgePill}>
              <Ionicons name="chatbox-outline" size={14} color={COLORS.success} />
              <Text style={styles.bridgeText}>Renters will message you here, in PadMagnet and your e-mail</Text>
            </View>
            <Ionicons name="swap-horizontal" size={20} color={COLORS.textSecondary} />
            <View style={styles.bridgePill}>
              <Ionicons name="mail-outline" size={14} color={COLORS.brandOrange} />
              <Text style={styles.bridgeText}>Owner's respond via e-mail, or in PadMagnet</Text>
            </View>
          </View>

          <Text style={styles.teaserHint}>
            Text ↔ Email bridge powered by PadMagnet
          </Text>

          <Pressable
            onPress={() => setShowAuth(true)}
            style={({ pressed }) => [styles.signInCard, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
          >
            <LinearGradient
              colors={['#FF8C38', '#F97316', COLORS.logoOrange, '#DC5A2C', '#B84A1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signInGradient}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.08)', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.signInShine}
              />
              <LinearGradient
                colors={['rgba(255,200,100,0.25)', 'transparent']}
                start={{ x: 0.5, y: 0.3 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.signInInnerGlow}
              />
              <View style={styles.signInContent}>
                <View style={styles.signInIconWrap}>
                  <Ionicons name="lock-open-outline" size={16} color={COLORS.white} />
                </View>
                <View style={styles.signInTextWrap}>
                  <Text style={styles.signInHeadline}>Activate Your Inbox</Text>
                  <Text style={styles.signInCaption}>Activate messaging. View your</Text>
                  <Text style={styles.signInCaption}>
                    <Text style={styles.signInCaptionHot}>HOT</Text> rental leads, instantly.
                  </Text>
                </View>
              </View>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.15)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.signInBottomEdge}
              />
            </LinearGradient>
          </Pressable>
        </View>

        <AuthBottomSheet
          visible={showAuth}
          onClose={() => setShowAuth(false)}
          context="owner_messages"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OwnerHeader minimal />
      <MessagesScreen emptySubtitle="Tenants will reach out when interested in your listing." />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.sm,
    paddingBottom: LAYOUT.padding.md,
  },
  teaserCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.xl,
    padding: LAYOUT.padding.xl,
    margin: LAYOUT.padding.md,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  teaserTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    textAlign: 'center',
  },
  bridgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
    paddingHorizontal: LAYOUT.padding.sm,
  },
  bridgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  bridgeText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  teaserHint: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  signInCard: {
    alignSelf: 'stretch',
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,180,80,0.4)',
  },
  signInGradient: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  signInShine: {
    ...StyleSheet.absoluteFillObject,
    bottom: '50%',
  },
  signInInnerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  signInBottomEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
  signInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signInIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  signInTextWrap: {
    flex: 1,
  },
  signInHeadline: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  signInCaption: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xxs,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 14,
    marginTop: 2,
  },
  signInCaptionHot: {
    fontFamily: FONTS.heading.bold,
    color: '#FFE58A',
    letterSpacing: 0.5,
  },
});
