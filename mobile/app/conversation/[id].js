import { useState, useEffect, useRef, useCallback } from 'react';
import useAndroidBack from '../../hooks/useAndroidBack';
import { FlatList, View, Text, Pressable, Linking, ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform, AppState, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MessageBubble, ChatInput } from '../../components/messaging';
import { EqualHousingBadge } from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ConversationScreen() {
  useAndroidBack();
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
  const [ownerEmail, setOwnerEmail] = useState(null);
  const [ownerPhone, setOwnerPhone] = useState(null);
  const [listingId, setListingId] = useState(null);
  const [streetAddress, setStreetAddress] = useState(null);
  const [cityStateZip, setCityStateZip] = useState(null);
  const [listingPhoto, setListingPhoto] = useState(null);
  const [viewerRole, setViewerRole] = useState(null); // 'renter' | 'owner'
  const [renterName, setRenterName] = useState(null);
  const [conversationCreatedAt, setConversationCreatedAt] = useState(null);
  const flatListRef = useRef(null);
  const router = useRouter();

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

  // Re-fetch messages when returning from background (Realtime may have disconnected)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchMessages();
    });
    return () => sub.remove();
  }, [fetchMessages]);

  // Mark conversation as read when opening
  useEffect(() => {
    if (!userId || !id) return;
    apiFetch(`/api/conversations/${id}/mark-read`, { method: 'POST' })
      .catch(err => console.warn('Mark-read failed:', err.message));
  }, [id, userId]);

  // Fetch conversation details (title, agent/owner info)
  // Must wait for userId so viewerRole can be determined correctly
  useEffect(() => {
    if (!userId) return;
    async function fetchConvo() {
      try {
        const convos = await apiFetch('/api/conversations');
        const convo = (convos || []).find(c => c.id === id);
        if (!convo) return;
        if (convo.created_at) setConversationCreatedAt(convo.created_at);
        if (convo.listing_id) setListingId(convo.listing_id);
        if (convo.listing_photo_url) setListingPhoto(convo.listing_photo_url);

        // Fetch listing for structured address fields
        if (convo.listing_id) {
          try {
            const listing = await apiFetch(`/api/listings/${convo.listing_id}`);
            const street = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
            const cityLine = [listing.city, listing.state_or_province, listing.postal_code].filter(Boolean).join(', ');
            setStreetAddress(street || convo.listing_address || 'Listing');
            setCityStateZip(cityLine || null);
            setTitle(street || convo.listing_address || 'Listing');
          } catch {
            setStreetAddress(convo.listing_address || 'Listing');
            setTitle(convo.listing_address || 'Listing');
          }
        } else {
          setStreetAddress(convo.listing_address || 'Listing');
          setTitle(convo.listing_address || 'Listing');
        }

        // Determine viewer role
        const isViewerRenter = userId === convo.tenant_user_id;
        setViewerRole(isViewerRenter ? 'renter' : 'owner');

        if (convo.conversation_type === 'external_agent') {
          setAgentName(convo.external_agent_name || null);
          setAgentEmail(convo.external_agent_email || null);
          setAgentPhone(convo.external_agent_phone || null);
          setSubtitle(`Listed by ${convo.external_agent_name || 'Listing Agent'}`);
        } else {
          setOwnerName(convo.owner_display_name || null);
          setOwnerEmail(convo.owner_email || null);
          setOwnerPhone(convo.owner_phone || null);
          if (convo.owner_display_name) {
            setSubtitle(`Listed by ${convo.owner_display_name}`);
          }
        }

        // Fetch renter name (for owner's view of inbound messages)
        if (convo.tenant_user_id && !isViewerRenter) {
          try {
            const { data: renterProfile } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', convo.tenant_user_id)
              .single();
            setRenterName(renterProfile?.display_name || 'Renter');
          } catch {
            setRenterName('Renter');
          }
        }
      } catch {
        // title stays as 'Chat'
      }
    }
    fetchConvo();
  }, [id, userId]);

  // Supabase Realtime: listen for new messages + status updates in this conversation
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          // Live update: delivery_status, read_at, channel changes
          const updated = payload.new;
          setMessages(prev => prev.map(m =>
            m.id === updated.id ? { ...m, ...updated } : m
          ));
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
        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 300);
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

  // Build the display list: messages + chronological system cards
  const OWNER_FALLBACK_MS = 8 * 60 * 60 * 1000;
  const hasCounterpartyReply = messages.some(m => m.sender_id !== userId && m.sender_id !== null)
    || messages.some(m => m.sender_id === null);
  const showOwnerFallback = !isExternal && !hasCounterpartyReply && conversationCreatedAt
    && (Date.now() - new Date(conversationCreatedAt).getTime() > OWNER_FALLBACK_MS);

  // Insert fallback card at the correct chronological position
  const displayItems = [...messages];
  if (showOwnerFallback && conversationCreatedAt) {
    const fallbackTime = new Date(new Date(conversationCreatedAt).getTime() + OWNER_FALLBACK_MS).toISOString();
    displayItems.push({
      id: 'system-fallback',
      _systemCard: 'owner_fallback',
      created_at: fallbackTime,
    });
    displayItems.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  // Insert date separators between messages on different days
  const withDates = [];
  let lastDate = null;
  for (const item of displayItems) {
    const d = new Date(item.created_at);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dateKey !== lastDate) {
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      const isToday = d.toDateString() === today.toDateString();
      const isYesterday = d.toDateString() === yesterday.toDateString();
      const label = isToday ? 'Today' : isYesterday ? 'Yesterday'
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
      withDates.push({ id: `date-${dateKey}`, _dateSeparator: label, created_at: item.created_at });
      lastDate = dateKey;
    }
    withDates.push(item);
  }
  const finalItems = withDates;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Custom chat header — photo + tappable address links to listing */}
      <View style={styles.chatHeader}>
        <Pressable style={styles.chatHeaderBack} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        {listingPhoto && (
          <Pressable onPress={() => listingId && router.push(`/listing/${listingId}`)}>
            <Image source={{ uri: listingPhoto }} style={styles.chatHeaderPhoto} contentFit="cover" />
          </Pressable>
        )}
        <View style={styles.chatHeaderCenter}>
          <Pressable onPress={() => listingId && router.push(`/listing/${listingId}`)}>
            <Text style={styles.chatHeaderTitle} numberOfLines={1}>{streetAddress || title}</Text>
          </Pressable>
          {cityStateZip && (
            <Text style={styles.chatHeaderCity} numberOfLines={1}>{cityStateZip}</Text>
          )}
          {subtitle && (
            <Text style={styles.chatHeaderSubtitle} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
      </View>

      <View style={styles.flex}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...finalItems].reverse()}
            inverted
            keyExtractor={item => item.id}
            ListFooterComponent={
              <View>
                {/* System message: agent conversation (shown at top of thread) */}
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
              </View>
            }
            renderItem={({ item }) => {
              // Date separator
              if (item._dateSeparator) {
                return (
                  <View style={styles.dateSeparator}>
                    <View style={styles.dateLine} />
                    <Text style={styles.dateLabel}>{item._dateSeparator}</Text>
                    <View style={styles.dateLine} />
                  </View>
                );
              }

              // System fallback card — rendered chronologically
              if (item._systemCard === 'owner_fallback') {
                const contactName = ownerName || agentName || 'the owner';
                const contactEmail = ownerEmail || agentEmail;
                const contactPhone = ownerPhone || agentPhone;
                return (
                  <View style={styles.fallbackCard}>
                    <Ionicons name="time-outline" size={18} color={COLORS.warning} />
                    <View style={styles.fallbackContent}>
                      <Text style={styles.fallbackText}>
                        No reply yet from {contactName}.
                      </Text>
                      {(contactEmail || contactPhone) && (
                        <View style={styles.fallbackContacts}>
                          <Text style={styles.contactTitle}>Reach them directly:</Text>
                          {contactEmail && (
                            <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${contactEmail}`)}>
                              <Ionicons name="mail-outline" size={14} color={COLORS.accent} />
                              <Text style={styles.contactText}>{contactEmail}</Text>
                            </Pressable>
                          )}
                          {contactPhone && (
                            <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`tel:${contactPhone}`)}>
                              <Ionicons name="call-outline" size={14} color={COLORS.accent} />
                              <Text style={styles.contactText}>{contactPhone}</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                      {listingId && (
                        <Pressable style={styles.fallbackLink} onPress={() => router.push(`/listing/${listingId}`)}>
                          <Ionicons name="home-outline" size={14} color={COLORS.brandOrange} />
                          <Text style={styles.fallbackLinkText}>View Listing Details</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              }

              const isMine = item.sender_id === userId;
              const isRead = isMine && counterpartyLastReadAt
                ? new Date(item.created_at) <= new Date(counterpartyLastReadAt)
                : false;

              // Compute sender label based on viewer's perspective
              // Returns { name, role } for split styling in MessageBubble
              let senderLabel = null;
              if (!isMine) {
                if (viewerRole === 'renter' && isExternal) {
                  senderLabel = { name: agentName || 'Listing Agent', role: 'Agent' };
                } else if (viewerRole === 'renter' && !isExternal) {
                  senderLabel = { name: ownerName || 'Property Owner', role: 'Owner' };
                } else if (viewerRole === 'owner') {
                  senderLabel = { name: renterName || 'Renter', role: 'Renter' };
                }
              }

              return (
                <View>
                  <MessageBubble
                    message={item}
                    isMine={isMine}
                    isRead={isRead}
                    senderLabel={senderLabel}
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
            contentContainerStyle={[styles.listContent, { paddingTop: kbHeight + 80 }]}
          />
        )}

        <Animated.View style={kbStyle}>
          <ChatInput onSend={handleSend} disabled={sending} />
          <EqualHousingBadge style={{ paddingVertical: 6, backgroundColor: COLORS.background }} />
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

  // ── Custom chat header ─────────────────────────
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.sm,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatHeaderBack: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  chatHeaderPhoto: {
    width: 48,
    height: 48,
    borderRadius: LAYOUT.radius.sm,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: COLORS.accent + '44',
  },
  chatHeaderCenter: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.brandOrange,
    textDecorationLine: 'underline',
  },
  chatHeaderCity: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  chatHeaderSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  // ── Chronological fallback card ────────────────
  fallbackCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: LAYOUT.padding.md,
    marginVertical: 10,
    padding: 14,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.warning + '44',
  },
  fallbackContent: {
    flex: 1,
    gap: 8,
  },
  fallbackText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  fallbackContacts: {
    gap: 2,
  },
  fallbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.brandOrange + '18',
    borderRadius: LAYOUT.radius.sm,
    alignSelf: 'flex-start',
  },
  fallbackLinkText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brandOrange,
  },

  // ── Date separators ────────────────────────────
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: LAYOUT.padding.lg,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dateLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
    marginHorizontal: 12,
  },
});
