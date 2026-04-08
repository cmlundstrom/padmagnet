import { useState, useEffect, useRef, useCallback } from 'react';
import { FlatList, View, Text, Pressable, Linking, ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  const [subtitle, setSubtitle] = useState(null);
  const [conversationType, setConversationType] = useState('internal_owner');
  const [counterpartyLastReadAt, setCounterpartyLastReadAt] = useState(null);
  const [agentName, setAgentName] = useState(null);
  const [agentEmail, setAgentEmail] = useState(null);
  const [agentPhone, setAgentPhone] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [conversationCreatedAt, setConversationCreatedAt] = useState(null);
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

  // Fetch conversation details (title, agent/owner info)
  useEffect(() => {
    async function fetchConvo() {
      try {
        const convos = await apiFetch('/api/conversations');
        const convo = (convos || []).find(c => c.id === id);
        if (!convo) return;
        if (convo.listing_address) setTitle(convo.listing_address);
        if (convo.created_at) setConversationCreatedAt(convo.created_at);

        if (convo.conversation_type === 'external_agent') {
          setAgentName(convo.external_agent_name || null);
          setAgentEmail(convo.external_agent_email || null);
          setAgentPhone(convo.external_agent_phone || null);
          const city = convo.listing_address?.split(',').slice(1).join(',').trim();
          setSubtitle(city
            ? `${city}\nListed by ${convo.external_agent_name || 'Listing Agent'}`
            : `Listed by ${convo.external_agent_name || 'Listing Agent'}`);
        } else if (convo.owner_display_name) {
          setSubtitle(`Listed by ${convo.owner_display_name}`);
          setOwnerName(convo.owner_display_name);
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
            // Remove any optimistic message that this real message replaces
            const filtered = prev.filter(m => !m.id.startsWith('optimistic-') || m.body !== newMsg.body);
            return [...filtered, newMsg];
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

  // Keyboard handling — track height for input lift + FlatList margin
  const kbOffset = useSharedValue(0);
  const [kbHeight, setKbHeight] = useState(0);
  const kbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -kbOffset.value }],
  }));

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const h = e.endCoordinates.height;
        kbOffset.value = withTiming(h, { duration: 250 });
        setKbHeight(h);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        kbOffset.value = withTiming(0, { duration: 200 });
        setKbHeight(0);
      }
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Agent: show contact info immediately. Owner: show after 8 hours with no reply.
  const OWNER_FALLBACK_MS = 8 * 60 * 60 * 1000;
  const hasCounterpartyReply = messages.some(m => m.sender_id !== userId && m.sender_id !== null)
    || messages.some(m => m.sender_id === null); // agent reply
  const showOwnerFallback = !isExternal && !hasCounterpartyReply && conversationCreatedAt
    && (Date.now() - new Date(conversationCreatedAt).getTime() > OWNER_FALLBACK_MS);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header title={title} subtitle={subtitle} showBack />

      <View style={styles.flex}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              <View>
                {/* System message: agent conversation */}
                {isExternal && agentName && (
                  <View style={styles.systemMsg}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.systemMsgText}>
                      This listing is managed by {agentName}. They'll receive your message via email and can reply directly to you.
                    </Text>
                  </View>
                )}
                {/* Agent contact info — shown immediately */}
                {isExternal && (agentEmail || agentPhone) && (
                  <View style={styles.contactCard}>
                    <Text style={styles.contactTitle}>Reach {agentName || 'the agent'} directly:</Text>
                    {agentEmail && (
                      <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${agentEmail}`)}>
                        <Ionicons name="mail-outline" size={14} color={COLORS.accent} />
                        <Text style={styles.contactText}>{agentEmail}</Text>
                      </Pressable>
                    )}
                    {agentPhone && (
                      <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`tel:${agentPhone}`)}>
                        <Ionicons name="call-outline" size={14} color={COLORS.accent} />
                        <Text style={styles.contactText}>{agentPhone}</Text>
                      </Pressable>
                    )}
                  </View>
                )}
                {/* Owner no-reply fallback — 8 hours */}
                {showOwnerFallback && ownerName && (
                  <View style={styles.systemMsg}>
                    <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                    <Text style={styles.systemMsgText}>
                      No reply yet from {ownerName}. You can reach them via the listing details.
                    </Text>
                  </View>
                )}
              </View>
            }
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
                    agentName={agentName}
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
            contentContainerStyle={[styles.listContent, { paddingBottom: kbHeight + 80 }]}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />
        )}

        <Animated.View style={kbStyle}>
          <ChatInput onSend={handleSend} disabled={sending} />
        </Animated.View>
      </View>
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
    paddingTop: LAYOUT.padding.sm,
    paddingBottom: 80,
  },
  readLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    textAlign: 'right',
    paddingRight: LAYOUT.padding.md,
    paddingBottom: 4,
  },
  systemMsg: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: LAYOUT.padding.md,
    marginVertical: 8,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
  },
  systemMsgText: {
    flex: 1,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  contactCard: {
    marginHorizontal: LAYOUT.padding.md,
    marginBottom: 8,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactTitle: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contactText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
});
