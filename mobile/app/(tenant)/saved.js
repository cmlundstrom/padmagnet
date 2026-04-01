import { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { EmptyState, GlossyHeart } from '../../components/ui';
import { ListingCard } from '../../components/listing';
import { useAlert } from '../../providers/AlertProvider';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

const TABS = [
  { key: 'right', label: 'Loved', icon: 'heart' },
  { key: 'left', label: 'Trash', icon: 'trash' },
];

export default function SavedScreen() {
  const alert = useAlert();
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

  // Re-fetch when tab gains focus (e.g. after swiping on swipe screen)
  useFocusEffect(
    useCallback(() => {
      fetchItems(activeTab, 1);
    }, [activeTab, fetchItems])
  );

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
    try {
      await apiFetch('/api/swipes', {
        method: 'POST',
        body: JSON.stringify({ listing_id: listingId, direction: 'left', padscore: 0 }),
      });
      setItems(prev => prev.filter(l => l.id !== listingId));
    } catch (err) {
      alert('Error', err.message);
    }
  }, [alert]);

  const handleReconsider = useCallback(async (listingId) => {
    try {
      await apiFetch('/api/swipes', {
        method: 'DELETE',
        body: JSON.stringify({ listing_id: listingId }),
      });
      setItems(prev => prev.filter(l => l.id !== listingId));
    } catch (err) {
      alert('Error', err.message);
    }
  }, [alert]);

  const isSaved = activeTab === 'right';
  const emptyIcon = isSaved ? <GlossyHeart size={48} /> : '🗑';
  const emptyTitle = isSaved ? 'No loved listings yet' : 'Trash is empty';
  const emptySubtitle = isSaved
    ? 'Swipe Right on the rental cards you Love and they\'ll appear right here.'
    : 'Rentals you Trash will appear here in case you want to reconsider them later.';

  const handleRestoreAll = useCallback(() => {
    alert(
      'Restore All?',
      'Restore all filtered-out listings to main search?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              await apiFetch('/api/swipes/reset?direction=left', { method: 'DELETE' });
              setItems([]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              alert('Error', err.message);
            }
          },
        },
      ]
    );
  }, [alert]);

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
        <Text style={[SCREEN.pageTitleFlush, { textAlign: 'center' }]}>Saved</Text>
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

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <View style={styles.titleRow}>
        <Text style={[SCREEN.pageTitleFlush, { textAlign: 'center' }]}>Saved</Text>
        {!isSaved && (
          <Pressable style={styles.restoreBtn} onPress={handleRestoreAll}>
            <FontAwesome name="refresh" size={16} color={COLORS.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Tab toggle */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={styles.tabInner}>
              {tab.icon && <FontAwesome name={tab.icon} size={15} color={activeTab === tab.key ? COLORS.white : COLORS.slate} />}
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </View>
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
              <ListingCard listing={item} padscore={item.swipePadscore} context={activeTab === 'right' ? 'saved' : undefined} />
              {isSaved ? (
                <Pressable style={styles.removeBtn} onPress={() => handleRemove(item.id)}>
                  <FontAwesome name="trash" size={17} color={COLORS.white} />
                </Pressable>
              ) : (
                <Pressable style={styles.reconsiderBtn} onPress={() => handleReconsider(item.id)}>
                  <Text style={styles.reconsiderBtnText}>Un-Trash</Text>
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
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
  },
  tabTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.body.semiBold,
  },
  listContent: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: 80,
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
    left: 6,
    width: 38,
    height: 38,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.accent + '55',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: LAYOUT.padding.md,
  },
  restoreBtn: {
    width: 34,
    height: 34,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
