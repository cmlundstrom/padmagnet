import { useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import SwipeCard from './SwipeCard';
import { EmptyState } from '../ui';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';

const VISIBLE_CARDS = 3;

export default function CardStack({
  listings,
  loading,
  error,
  onSwipe,
  onTapCard,
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

  // Pre-fetch when running low
  if (listings.length <= 3 && hasMore && onLoadMore) {
    onLoadMore();
  }

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
        title="No more listings"
        subtitle="You've seen all available listings. Try adjusting your preferences or check back later."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  const visibleListings = listings.slice(0, VISIBLE_CARDS);

  return (
    <View style={styles.container}>
      {visibleListings.map((listing, index) => {
        const reverseIndex = visibleListings.length - 1 - index;
        return (
          <BackCard key={listing.id} index={reverseIndex}>
            <SwipeCard
              listing={listing}
              isTop={index === 0}
              onSwipe={handleSwipe}
              onTap={handleTap}
            />
          </BackCard>
        );
      }).reverse()}
    </View>
  );
}

function BackCard({ children, index }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: withTiming(interpolate(index, [0, 1, 2], [1, 0.95, 0.9]), { duration: 200 }) },
      { translateY: withTiming(interpolate(index, [0, 1, 2], [0, 10, 20]), { duration: 200 }) },
    ],
    zIndex: 10 - index,
  }));

  return (
    <Animated.View style={[styles.cardWrapper, style]}>
      {children}
    </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
