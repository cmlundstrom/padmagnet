import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MarketStats from '../../components/owner/MarketStats';
import UpgradeCTA from '../../components/owner/UpgradeCTA';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

export default function ExploreScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <Text style={styles.header}>Explore</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nearby Rentals card */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/owner/nearby-rentals')}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="location-sharp" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Nearby Rentals</Text>
              <Text style={styles.cardSubtitle}>
                See what's listed near your property
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </View>
        </Pressable>

        {/* Market Snapshot */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionTitle}>Market Snapshot</Text>
        </View>
        <MarketStats />

        {/* Your Plan */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionTitle}>Your Plan</Text>
        </View>
        <UpgradeCTA />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.sm,
    paddingBottom: LAYOUT.padding.sm,
  },
  scrollContent: {
    padding: LAYOUT.padding.md,
    paddingTop: 0,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.borderRadius.lg,
    padding: LAYOUT.padding.md,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sectionLabel: {
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: 4,
  },
});
