import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import useAndroidBack from '../../hooks/useAndroidBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import UpgradeCTA from '../../components/owner/UpgradeCTA';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function PostActivationScreen() {
  useAndroidBack();
  const router = useRouter();
  const { confirmation_code, county, preview } = useLocalSearchParams();
  const { role } = useAuth();
  const isAdminPreview = preview === 'true' && ['admin', 'super_admin'].includes(role);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {isAdminPreview && (
          <View style={styles.previewBanner}>
            <Text style={styles.previewBannerText}>Admin Preview Mode</Text>
          </View>
        )}
        <View style={styles.celebrationIcon}>
          <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
        </View>

        <Text style={styles.heading}>Your Listing is Live!</Text>

        <Text style={styles.confirmation}>
          Confirmation: {confirmation_code || 'PM-XXXXXX'}
        </Text>

        <Text style={styles.subtitle}>
          Matched tenants in {county || 'your area'} can now discover your listing.
        </Text>

        <View style={styles.upgradeCta}>
          <UpgradeCTA variant="card" targetTier="pro" />
        </View>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.replace('/(owner)/listings')}
        >
          <Text style={styles.primaryBtnText}>View My Listing</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/(owner)/listings')}>
          <Text style={styles.skipLink}>Skip for Now</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  previewBanner: {
    backgroundColor: COLORS.warning + '33',
    borderRadius: LAYOUT.radius.sm,
    padding: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  previewBannerText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: LAYOUT.padding['2xl'],
    paddingBottom: 80,
  },
  celebrationIcon: {
    marginBottom: LAYOUT.padding.lg,
  },
  heading: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.sm,
  },
  confirmation: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.brandOrange,
    textAlign: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  subtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: LAYOUT.padding.xl,
  },
  upgradeCta: {
    alignSelf: 'stretch',
    marginBottom: LAYOUT.padding.lg,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.accent,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: LAYOUT.padding.md,
  },
  primaryBtnText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  skipLink: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
