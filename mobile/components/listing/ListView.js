import { FlatList, ActivityIndicator, View, StyleSheet } from 'react-native';
import { EmptyState } from '../ui';
import ListingCard from './ListingCard';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';

export default function ListView({ listings = [], loading, error, onRefresh, hasMore, onLoadMore }) {
  if (loading && listings.length === 0) {
    return (
      <View style={styles.centered}>
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
        title="No listings found"
        subtitle="Try adjusting your preferences or check back later."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  // Sort by PadScore descending
  const sorted = [...listings].sort((a, b) => {
    const scoreA = a.padScore?.score ?? 0;
    const scoreB = b.padScore?.score ?? 0;
    return scoreB - scoreA;
  });

  return (
    <FlatList
      data={sorted}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          padscore={item.padScore?.score}
          style={styles.card}
        />
      )}
      onEndReached={() => {
        if (hasMore && onLoadMore) onLoadMore();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        hasMore && listings.length > 0 ? (
          <ActivityIndicator style={styles.footer} color={COLORS.accent} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.sm,
    paddingBottom: LAYOUT.padding.lg,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
  },
  footer: {
    paddingVertical: LAYOUT.padding.md,
  },
});
