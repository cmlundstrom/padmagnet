import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList, View, Text, Alert, ActivityIndicator,
  RefreshControl, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import { EmptyState } from '../ui';
import { ConversationItem } from '../messaging';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'archived', label: 'Archived' },
];

export default function MessagesScreen({ emptySubtitle }) {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [unreadBadge, setUnreadBadge] = useState(0);
  const openSwipeableRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  const fetchConversations = useCallback(async (tab) => {
    const targetTab = tab || activeTab;
    try {
      setError(null);
      const data = await apiFetch(`/api/conversations?tab=${targetTab}`);
      setConversations(data || []);

      // Also fetch unread count for badge
      if (targetTab !== 'unread') {
        const unreadData = await apiFetch('/api/conversations?tab=unread');
        setUnreadBadge((unreadData || []).length);
      } else {
        setUnreadBadge((data || []).length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchConversations(activeTab);
  }, [activeTab]);

  // Realtime: re-fetch on new messages or conversation updates
  useEffect(() => {
    const channel = supabase
      .channel('messages-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setLoading(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const handleArchive = useCallback(async (conversationId) => {
    try {
      await apiFetch(`/api/conversations/${conversationId}/archive`, {
        method: 'POST',
        body: JSON.stringify({ action: 'archive' }),
      });
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (err) {
      console.warn('Archive failed:', err.message);
    }
  }, []);

  const handleUnarchive = useCallback(async (conversationId) => {
    try {
      await apiFetch(`/api/conversations/${conversationId}/archive`, {
        method: 'POST',
        body: JSON.stringify({ action: 'unarchive' }),
      });
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (err) {
      console.warn('Unarchive failed:', err.message);
    }
  }, []);

  const handleDelete = useCallback((conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure? This conversation will be moved to your archive.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/conversations/${conversationId}/archive`, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete' }),
              });
              setConversations(prev => prev.filter(c => c.id !== conversationId));
            } catch (err) {
              console.warn('Delete failed:', err.message);
            }
          },
        },
      ]
    );
  }, []);

  // Close any open swipeable when another opens
  const closeOpenSwipeable = useCallback((ref) => {
    if (openSwipeableRef.current && openSwipeableRef.current !== ref) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = ref;
  }, []);

  function renderRightActions(conversationId) {
    // RectButton from gesture-handler coordinates with ReanimatedSwipeable
    // (RN TouchableOpacity gets its taps stolen by the pan gesture)
    return (
      <View style={styles.swipeActions}>
        <RectButton
          style={[styles.swipeBtn, styles.archiveBtn]}
          onPress={() => handleArchive(conversationId)}
        >
          <Text style={styles.swipeBtnText}>Archive</Text>
        </RectButton>
        <RectButton
          style={[styles.swipeBtn, styles.deleteBtn]}
          onPress={() => handleDelete(conversationId)}
        >
          <Text style={styles.swipeBtnText}>Delete</Text>
        </RectButton>
      </View>
    );
  }

  function renderLeftActions(conversationId) {
    return (
      <View style={styles.swipeActions}>
        <RectButton
          style={[styles.swipeBtn, styles.unarchiveBtn]}
          onPress={() => handleUnarchive(conversationId)}
        >
          <Text style={styles.swipeBtnText}>Restore</Text>
        </RectButton>
      </View>
    );
  }

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={SCREEN.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <SafeAreaView style={SCREEN.containerFlush}>
        <Text style={SCREEN.pageTitleFlush}>Messages</Text>
        <EmptyState
          icon="!"
          title="Something went wrong"
          subtitle={error}
          actionLabel="Retry"
          onAction={() => fetchConversations()}
        />
      </SafeAreaView>
    );
  }

  const emptyMessages = {
    all: { title: 'No conversations yet', subtitle: emptySubtitle || 'Start a conversation to see it here.' },
    unread: { title: 'All caught up!', subtitle: 'No unread messages.' },
    archived: { title: 'No archived messages', subtitle: 'Swipe left on a conversation to archive it.' },
  };

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <Text style={SCREEN.pageTitleFlush}>Messages</Text>

      {/* Segment Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.key === 'unread' && unreadBadge > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {unreadBadge > 99 ? '99+' : unreadBadge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {conversations.length === 0 ? (
        <EmptyState
          icon="💬"
          title={emptyMessages[activeTab].title}
          subtitle={emptyMessages[activeTab].subtitle}
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={
                activeTab !== 'archived'
                  ? () => renderRightActions(item.id)
                  : undefined
              }
              renderLeftActions={
                activeTab === 'archived'
                  ? () => renderLeftActions(item.id)
                  : undefined
              }
              rightThreshold={40}
              overshootFriction={8}
              onSwipeableWillOpen={() => closeOpenSwipeable(null)}
            >
              <ConversationItem
                conversation={item}
                currentUserId={userId}
                onPress={() => router.push(`/conversation/${item.id}`)}
              />
            </Swipeable>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tabText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  tabBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontFamily: FONTS.body.bold,
    fontSize: 10,
    color: COLORS.white,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  archiveBtn: {
    backgroundColor: '#F59E0B',
  },
  deleteBtn: {
    backgroundColor: COLORS.danger,
  },
  unarchiveBtn: {
    backgroundColor: '#22C55E',
  },
  swipeBtnText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },
});
