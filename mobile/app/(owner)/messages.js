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

          <Pressable onPress={() => setShowAuth(true)} style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
            <LinearGradient
              colors={[COLORS.logoOrange, '#D14E2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInButton}
            >
              <Ionicons name="log-in-outline" size={18} color={COLORS.white} />
              <Text style={styles.signInButtonText}>Sign in to activate your inbox</Text>
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
    gap: 12,
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
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: LAYOUT.radius.lg,
    marginTop: 4,
    shadowColor: COLORS.logoOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  signInButtonText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
});
