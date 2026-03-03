import { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui';
import { ListingCard } from '../../components/listing';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

export default function SavedScreen() {
  const [savedListings, setSavedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchSaved = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      const data = await apiFetch(`/api/swipes?direction=right&page=${pageNum}&limit=20`);
      const items = (data.swipes || [])
        .filter(s => s.listing)
        .map(s => ({ ...s.listing, swipePadscore: s.padscore }));

      if (append) {
        setSavedListings(prev => [...prev, ...items]);
      } else {
        setSavedListings(items);
      }

      setHasMore(items.length === 20);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved(1);
  }, [fetchSaved]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSaved(1);
  }, [fetchSaved]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchSaved(page + 1, true);
    }
  }, [loading, hasMore, page, fetchSaved]);

  if (loading && savedListings.length === 0) {
    return (
      <SafeAreaView style={SCREEN.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (error && savedListings.length === 0) {
    return (
      <SafeAreaView style={SCREEN.containerFlush}>
        <Text style={SCREEN.pageTitleFlush}>Saved</Text>
        <EmptyState
          icon="!"
          title="Something went wrong"
          subtitle={error}
          actionLabel="Retry"
          onAction={() => fetchSaved(1)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <Text style={SCREEN.pageTitleFlush}>Saved</Text>

      {savedListings.length === 0 ? (
        <EmptyState
          icon="♡"
          title="No saved listings yet"
          subtitle="Swipe right on listings you like and they'll appear here."
        />
      ) : (
        <FlatList
          data={savedListings}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              padscore={item.swipePadscore}
              style={styles.cardItem}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
          ListFooterComponent={
            hasMore && savedListings.length > 0 ? (
              <ActivityIndicator style={styles.footer} color={COLORS.accent} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.lg,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  cardItem: {
    flex: 1,
  },
  footer: {
    paddingVertical: LAYOUT.padding.md,
  },
});
