import { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator, RefreshControl, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui';
import { ListingCard } from '../../components/listing';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

const TABS = [
  { key: 'right', label: 'Saved' },
  { key: 'left', label: 'Passed' },
];

export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState('right');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchItems = useCallback(async (direction, pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      const data = await apiFetch(`/api/swipes?direction=${direction}&page=${pageNum}&limit=20`);
      const list = (data.swipes || [])
        .filter(s => s.listing)
        .map(s => ({ ...s.listing, swipePadscore: s.padscore }));

      if (append) {
        setItems(prev => [...prev, ...list]);
      } else {
        setItems(list);
      }

      setHasMore(list.length === 20);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchItems(activeTab, 1);
  }, [activeTab, fetchItems]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems(activeTab, 1);
  }, [activeTab, fetchItems]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchItems(activeTab, page + 1, true);
    }
  }, [loading, hasMore, page, activeTab, fetchItems]);

  const handleRemove = useCallback(async (listingId) => {
    const label = activeTab === 'right' ? 'saved' : 'passed';
    Alert.alert(
      'Remove listing?',
      `This listing will be removed from your ${label} list and return to your swipe deck.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch('/api/swipes', {
                method: 'DELETE',
                body: JSON.stringify({ listing_id: listingId }),
              });
              setItems(prev => prev.filter(l => l.id !== listingId));
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  }, [activeTab]);

  const handleReconsider = useCallback(async (listingId) => {
    try {
      await apiFetch('/api/swipes', {
        method: 'DELETE',
        body: JSON.stringify({ listing_id: listingId }),
      });
      setItems(prev => prev.filter(l => l.id !== listingId));
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, []);

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={SCREEN.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (error && items.length === 0) {
    return (
      <SafeAreaView style={SCREEN.containerFlush}>
        <Text style={SCREEN.pageTitleFlush}>Saved</Text>
        <EmptyState
          icon="!"
          title="Something went wrong"
          subtitle={error}
          actionLabel="Retry"
          onAction={() => fetchItems(activeTab, 1)}
        />
      </SafeAreaView>
    );
  }

  const isSaved = activeTab === 'right';
  const emptyIcon = isSaved ? '♡' : '✕';
  const emptyTitle = isSaved ? 'No saved listings yet' : 'No passed listings';
  const emptySubtitle = isSaved
    ? 'Swipe right on listings you like and they\'ll appear here.'
    : 'Listings you skip will appear here so you can reconsider them.';

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <Text style={SCREEN.pageTitleFlush}>Saved</Text>

      {/* Tab toggle */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {items.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardItem}>
              <ListingCard listing={item} padscore={item.swipePadscore} />
              {isSaved ? (
                <Pressable style={styles.removeBtn} onPress={() => handleRemove(item.id)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.reconsiderBtn} onPress={() => handleReconsider(item.id)}>
                  <Text style={styles.reconsiderBtnText}>Reconsider</Text>
                </Pressable>
              )}
            </View>
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
            hasMore && items.length > 0 ? (
              <ActivityIndicator style={styles.footer} color={COLORS.accent} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: LAYOUT.radius.md - 3,
  },
  tabActive: {
    backgroundColor: COLORS.card,
  },
  tabText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.accent,
    fontFamily: FONTS.body.semiBold,
  },
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
    position: 'relative',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  removeBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontFamily: FONTS.heading.bold,
  },
  reconsiderBtn: {
    marginTop: 4,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  reconsiderBtnText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
  },
  footer: {
    paddingVertical: LAYOUT.padding.md,
  },
});
