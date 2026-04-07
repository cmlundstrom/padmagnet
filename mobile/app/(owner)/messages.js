import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import MessagesScreen from '../../components/screens/MessagesScreen';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import OwnerHeader from '../../components/owner/OwnerHeader';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OwnerMessages() {
  const { session } = useAuth();
  const isAnon = session?.user?.is_anonymous === true;
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
              <Ionicons name="mail-outline" size={14} color={COLORS.brandOrange} />
              <Text style={styles.bridgeText}>Owners reply from email</Text>
            </View>
            <Ionicons name="swap-horizontal" size={18} color={COLORS.slate} />
            <View style={styles.bridgePill}>
              <Ionicons name="chatbox-outline" size={14} color={COLORS.success} />
              <Text style={styles.bridgeText}>Renters reply by text</Text>
            </View>
          </View>

          <Text style={styles.teaserHint}>
            Text ↔ Email bridge powered by PadMagnet
          </Text>

          <Text
            style={styles.signInLink}
            onPress={() => setShowAuth(true)}
          >
            Sign in to activate your inbox →
          </Text>
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
    gap: 8,
    marginVertical: 4,
  },
  bridgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bridgeText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  teaserHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  signInLink: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    marginTop: 4,
  },
});
