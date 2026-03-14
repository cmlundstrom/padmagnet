import { useState, useEffect, useRef, useCallback } from 'react';
import { FlatList, View, Text, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '../../components/ui';
import { MessageBubble, ChatInput } from '../../components/messaging';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState(null);
  const [title, setTitle] = useState('Chat');
  const [conversationType, setConversationType] = useState('internal_owner');
  const [counterpartyLastReadAt, setCounterpartyLastReadAt] = useState(null);
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
      const result = await apiFetch(`/api/messages?conversation_id=${id}`);

      // v4: response is { messages, conversation_type, counterparty_last_read_at }
      if (Array.isArray(result)) {
        // Backward compat: old API returns flat array
        setMessages(result);
      } else {
        setMessages(result.messages || []);
        setConversationType(result.conversation_type || 'internal_owner');
        setCounterpartyLastReadAt(result.counterparty_last_read_at || null);
      }
    } catch (err) {
      console.warn('Failed to fetch messages:', err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark conversation as read when opening
  useEffect(() => {
    if (!userId || !id) return;
    apiFetch(`/api/conversations/${id}/mark-read`, { method: 'POST' })
      .catch(err => console.warn('Mark-read failed:', err.message));
  }, [id, userId]);

  // Fetch conversation title
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
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read immediately if it's from someone else
          if (newMsg.sender_id !== userId) {
            apiFetch(`/api/conversations/${id}/mark-read`, { method: 'POST' })
              .catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  // Realtime: listen for conversation updates (read receipt changes)
  useEffect(() => {
    const channel = supabase
      .channel(`read-receipt-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updated = payload.new;
          if (userId === updated.tenant_user_id) {
            setCounterpartyLastReadAt(updated.owner_last_read_at);
          } else {
            setCounterpartyLastReadAt(updated.tenant_last_read_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  const handleSend = useCallback(async (text) => {
    if (sending) return;
    setSending(true);

    const optimistic = {
      id: `optimistic-${Date.now()}`,
      conversation_id: id,
      sender_id: userId,
      body: text,
      created_at: new Date().toISOString(),
      read: false,
      read_at: null,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const msg = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: id, body: text }),
      });
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? msg : m)
      );
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      console.warn('Failed to send message:', err.message);
    } finally {
      setSending(false);
    }
  }, [id, userId, sending]);

  // Find the last message read by counterparty for "Read" label
  const lastReadMessageId = (() => {
    if (!counterpartyLastReadAt || conversationType === 'external_agent') return null;
    const readAt = new Date(counterpartyLastReadAt);
    const myMessages = messages
      .filter(m => m.sender_id === userId && new Date(m.created_at) <= readAt);
    return myMessages.length > 0 ? myMessages[myMessages.length - 1].id : null;
  })();

  const isExternal = conversationType === 'external_agent';

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
            renderItem={({ item }) => {
              const isMine = item.sender_id === userId;
              const isRead = isMine && counterpartyLastReadAt
                ? new Date(item.created_at) <= new Date(counterpartyLastReadAt)
                : false;

              return (
                <View>
                  <MessageBubble
                    message={item}
                    isMine={isMine}
                    isRead={isRead}
                    isExternal={isExternal}
                  />
                  {item.id === lastReadMessageId && (
                    <Text style={styles.readLabel}>
                      Read {new Date(counterpartyLastReadAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>
              );
            }}
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
  readLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.slate,
    textAlign: 'right',
    paddingRight: LAYOUT.padding.md,
    paddingBottom: 4,
  },
});
