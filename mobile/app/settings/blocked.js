/**
 * Blocked users — list + unblock.
 *
 * Required by Google Play UGC Policy: users must be able to view + manage
 * who they've blocked. Read /api/blocks to populate; tap Unblock to fire
 * DELETE /api/blocks/:userId.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import useAndroidBack from '../../hooks/useAndroidBack';
import { Header } from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function BlockedUsersScreen() {
  useAndroidBack();
  const alert = useAlert();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  const fetchBlocks = useCallback(async () => {
    try {
      const data = await apiFetch('/api/blocks');
      setBlocks(data?.blocks || []);
    } catch (err) {
      alert('Could not load blocked users', err.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [alert]);

  // Refresh on focus so unblock from another screen reflects immediately
  useFocusEffect(
    useCallback(() => {
      fetchBlocks();
    }, [fetchBlocks]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBlocks();
  }, [fetchBlocks]);

  const handleUnblock = useCallback((item) => {
    Haptics.selectionAsync();
    const name = item.display_name || item.email || 'this user';
    alert(
      `Unblock ${name}?`,
      "They'll be able to message you again, and their listings will reappear in your feed.",
      [
        { text: 'Cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblockingId(item.blocked_id);
            try {
              await apiFetch(`/api/blocks/${item.blocked_id}`, { method: 'DELETE' });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setBlocks(prev => prev.filter(b => b.blocked_id !== item.blocked_id));
            } catch (err) {
              alert('Could not unblock', err.message || 'Please try again.');
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ],
    );
  }, [alert]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Blocked users" showBack />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : blocks.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyText}>
            When you block someone from a conversation, they'll appear here.
            You can unblock anytime.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(item) => item.blocked_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
            />
          }
          ListHeaderComponent={
            <Text style={styles.intro}>
              These users can't message you, and their listings are hidden
              from your feed. Tap Unblock to restore them.
            </Text>
          }
          renderItem={({ item }) => {
            const name = item.display_name || item.email || 'Unknown user';
            const isUnblocking = unblockingId === item.blocked_id;
            return (
              <View style={styles.row} testID={`blocked-row-${item.blocked_id}`}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
                  {item.display_name && item.email ? (
                    <Text style={styles.rowEmail} numberOfLines={1}>{item.email}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => handleUnblock(item)}
                  disabled={isUnblocking}
                  testID={`blocked-unblock-${item.blocked_id}`}
                  style={({ pressed }) => [
                    styles.unblockBtn,
                    pressed && { opacity: 0.7 },
                    isUnblocking && { opacity: 0.4 },
                  ]}
                >
                  {isUnblocking ? (
                    <ActivityIndicator size="small" color={COLORS.brandOrange} />
                  ) : (
                    <Text style={styles.unblockText}>Unblock</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyTitle: {
    marginTop: 16,
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  emptyText: {
    marginTop: 8,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: LAYOUT.padding.md,
    paddingBottom: 40,
  },
  intro: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface || '#1a2438',
    borderRadius: LAYOUT.radius.md,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  rowEmail: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: LAYOUT.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.brandOrange,
    minWidth: 84,
    alignItems: 'center',
  },
  unblockText: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brandOrange,
  },
});
