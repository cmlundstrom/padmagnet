import { useCallback, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import CardStack from '../../components/cards/CardStack';
import MapView from '../../components/map/MapView';
import { ListView } from '../../components/listing';
import useListings from '../../hooks/useListings';
import useSwipe from '../../hooks/useSwipe';
import usePreferences from '../../hooks/usePreferences';
import { calculatePadScore } from '../../lib/padscore';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { MLS_COPYRIGHT } from '../../constants/mls';

const VIEW_MODES = ['cards', 'map', 'list'];
const VIEW_ICONS = { cards: '▣', map: '◎', list: '☰' };

export default function SwipeScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState('cards');
  const { listings, loading, error, hasMore, loadMore, refresh, removeFromDeck } = useListings();
  const { recordSwipe } = useSwipe();
  const { preferences } = usePreferences();

  // Attach PadScore to each listing
  const scoredListings = listings.map(listing => {
    if (!listing.padScore) {
      listing.padScore = calculatePadScore(preferences, listing);
    }
    return listing;
  });

  const handleSwipe = useCallback(async (listing, direction) => {
    Haptics.impactAsync(
      direction === 'right'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );

    removeFromDeck(listing.id);

    const score = listing.padScore?.score ?? 50;
    recordSwipe(listing.id, direction, score);
  }, [removeFromDeck, recordSwipe]);

  const handleTapCard = useCallback((listing) => {
    router.push(`/listing/${listing.id}`);
  }, [router]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>PadMagnet</Text>
          <View style={styles.viewToggle}>
            {VIEW_MODES.map(mode => (
              <Pressable
                key={mode}
                style={[
                  styles.toggleButton,
                  viewMode === mode && styles.toggleButtonActive,
                ]}
                onPress={() => setViewMode(mode)}
              >
                <Text
                  style={[
                    styles.toggleIcon,
                    viewMode === mode && styles.toggleIconActive,
                  ]}
                >
                  {VIEW_ICONS[mode]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Card area */}
        <View style={styles.cardArea}>
          {viewMode === 'cards' && (
            <CardStack
              listings={scoredListings}
              loading={loading}
              error={error}
              onSwipe={handleSwipe}
              onTapCard={handleTapCard}
              onRefresh={refresh}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          )}
          {viewMode === 'map' && (
            <MapView
              listings={scoredListings}
              loading={loading}
            />
          )}
          {viewMode === 'list' && (
            <ListView
              listings={scoredListings}
              loading={loading}
              error={error}
              onRefresh={refresh}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          )}
        </View>

        {/* Action buttons (cards mode only) */}
        {viewMode === 'cards' && scoredListings.length > 0 && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => {
                if (scoredListings.length > 0) {
                  handleSwipe(scoredListings[0], 'left');
                }
              }}
            >
              <Text style={[styles.actionText, { color: COLORS.danger }]}>✕</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.infoButton]}
              onPress={() => {
                if (scoredListings.length > 0) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleTapCard(scoredListings[0]);
                }
              }}
            >
              <Text style={[styles.actionText, { color: COLORS.accent }]}>i</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.saveButton]}
              onPress={() => {
                if (scoredListings.length > 0) {
                  handleSwipe(scoredListings[0], 'right');
                }
              }}
            >
              <Text style={[styles.actionText, { color: COLORS.success }]}>♡</Text>
            </Pressable>
          </View>
        )}

        {/* MLS compliance footer */}
        <Text style={styles.mlsFooter}>
          {MLS_COPYRIGHT.replace('{year}', new Date().getFullYear())}
        </Text>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
  logo: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.accent,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.sm,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: LAYOUT.radius.sm - 2,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.card,
  },
  toggleIcon: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  toggleIconActive: {
    color: COLORS.accent,
  },
  cardArea: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: LAYOUT.padding.md,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: COLORS.surface,
  },
  skipButton: {
    borderColor: COLORS.danger,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: COLORS.accent,
  },
  saveButton: {
    borderColor: COLORS.success,
  },
  actionText: {
    fontSize: 22,
    fontFamily: FONTS.heading.bold,
  },
  mlsFooter: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.slate,
    textAlign: 'center',
    paddingBottom: LAYOUT.padding.sm,
    paddingHorizontal: LAYOUT.padding.md,
  },
});
