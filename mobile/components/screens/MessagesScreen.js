import { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '../ui';
import { ConversationItem } from '../messaging';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { SCREEN } from '../../constants/screenStyles';

export default function MessagesScreen({ emptySubtitle }) {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch('/api/conversations');
      setConversations(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  if (loading) {
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
          onAction={fetchConversations}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <Text style={SCREEN.pageTitleFlush}>Messages</Text>

      {conversations.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No conversations yet"
          subtitle={emptySubtitle || 'Start a conversation to see it here.'}
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              currentUserId={userId}
              onPress={() => router.push(`/conversation/${item.id}`)}
            />
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

