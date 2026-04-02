import { useCallback, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import SwipeCard from './SwipeCard';
import { EmptyState } from '../ui';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';

export default function CardStack({
  listings,
  loading,
  error,
  onSwipe,
  onTapCard,
  onPreferences,
  onRefresh,
  hasMore,
  onLoadMore,
}) {
  const handleSwipe = useCallback((direction) => {
    if (listings.length > 0) {
      onSwipe(listings[0], direction);
    }
  }, [listings, onSwipe]);

  const handleTap = useCallback(() => {
    if (listings.length > 0 && onTapCard) {
      onTapCard(listings[0]);
    }
  }, [listings, onTapCard]);

  const hasWiggled = useRef(false);

  // Pre-fetch when running low
  useEffect(() => {
    if (listings.length <= 3 && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [listings.length, hasMore, onLoadMore]);

  if (loading && listings.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (error && listings.length === 0) {
    return (
      <EmptyState
        icon="!"
        title="Something went wrong"
        subtitle={error}
        actionLabel="Retry"
        onAction={onRefresh}
      />
    );
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        icon="◇"
        title="No listings right now"
        subtitle="We don't have homes that fit your search yet. Try widening your PadScore preferences or check back soon for fresh listings."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  const shouldWiggle = !hasWiggled.current;
  if (shouldWiggle) hasWiggled.current = true;

  return (
    <View style={styles.container}>
      {/* Next card (behind) — no gestures, just visual */}
      {listings.length > 1 && (
        <View style={[styles.cardWrapper, styles.backCard]} pointerEvents="none">
          <SwipeCard
            listing={listings[1]}
            isTop={false}
            onSwipe={() => {}}
            onTap={() => {}}
          />
        </View>
      )}

      {/* Top card — receives gestures */}
      <View style={styles.cardWrapper}>
        <SwipeCard
          key={listings[0].id}
          listing={listings[0]}
          isTop={true}
          wiggle={shouldWiggle}
          onSwipe={handleSwipe}
          onTap={handleTap}
          onPreferences={onPreferences}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    width: LAYOUT.card.width,
    height: LAYOUT.card.height,
  },
  backCard: {
    transform: [{ translateX: -9 }, { translateY: 15 }],
    opacity: 0.75,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
