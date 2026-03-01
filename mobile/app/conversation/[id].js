import { useState, useEffect, useRef, useCallback } from 'react';
import { FlatList, View, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '../../components/ui';
import { MessageBubble, ChatInput } from '../../components/messaging';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { LAYOUT } from '../../constants/layout';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState(null);
  const [title, setTitle] = useState('Chat');
  const flatListRef = useRef(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/messages?conversation_id=${id}`);
      setMessages(data || []);
    } catch (err) {
      console.warn('Failed to fetch messages:', err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Fetch conversation details for header title
  useEffect(() => {
    async function fetchConvo() {
      try {
        const convos = await apiFetch('/api/conversations');
        const convo = (convos || []).find(c => c.id === id);
        if (convo?.listing_address) {
          setTitle(convo.listing_address);
        }
      } catch {
        // title stays as 'Chat'
      }
    }
    fetchConvo();
  }, [id]);

  // Supabase Realtime: listen for new messages in this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new;
          // Only add if not already in list (avoid duplicates from optimistic add)
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSend = useCallback(async (text) => {
    if (sending) return;
    setSending(true);

    // Optimistic add
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      conversation_id: id,
      sender_id: userId,
      body: text,
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const msg = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: id, body: text }),
      });

      // Replace optimistic with real message
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? msg : m)
      );
    } catch (err) {
      // Remove failed optimistic message
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      console.warn('Failed to send message:', err.message);
    } finally {
      setSending(false);
    }
  }, [id, userId, sending]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={title} showBack />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isMine={item.sender_id === userId}
              />
            )}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />
        )}

        <ChatInput onSend={handleSend} disabled={sending} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: LAYOUT.padding.sm,
  },
});
