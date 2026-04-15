import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import NoPhotoPlaceholder from '../ui/NoPhotoPlaceholder';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

function timeAgo(dateString) {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Determine read receipt status for the last message sent by the current user.
 * Returns: 'sent' | 'delivered' | 'read' | null
 */
function getReceiptStatus(conversation, currentUserId) {
  const isTenant = conversation.tenant_user_id === currentUserId;
  const myUnread = isTenant
    ? conversation.tenant_unread_count
    : conversation.owner_unread_count;

  // If we have unread messages, the last message wasn't ours
  if (myUnread > 0) return null;

  // External agent conversations — max "delivered", never "read"
  if (conversation.conversation_type === 'external_agent') {
    return 'delivered';
  }

  // Internal conversation — check if counterparty read
  const counterpartyReadAt = isTenant
    ? conversation.owner_last_read_at
    : conversation.tenant_last_read_at;

  if (counterpartyReadAt && conversation.last_message_at) {
    if (new Date(counterpartyReadAt) >= new Date(conversation.last_message_at)) {
      return 'read';
    }
  }

  return 'delivered';
}

function ReadReceipt({ status, isExternal }) {
  if (!status) return null;

  const isRead = status === 'read';
  const color = isRead ? COLORS.successLight : COLORS.brandOrange;

  return (
    <View style={receiptStyles.container}>
      <Text style={[receiptStyles.check, { color }]}>
        {status === 'sent' ? '\u2713' : '\u2713\u2713'}
      </Text>
      {isExternal && (
        <Text style={receiptStyles.channelText}>via SMS/Email</Text>
      )}
    </View>
  );
}

const receiptStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  check: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.body.regular,
  },
  channelText: {
    fontSize: FONT_SIZES.xxs,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
  },
});

export default function ConversationItem({ conversation, currentUserId, onPress }) {
  const isTenant = conversation.tenant_user_id === currentUserId;
  const unread = isTenant
    ? conversation.tenant_unread_count
    : conversation.owner_unread_count;

  const hasUnread = unread > 0;
  const isExternal = conversation.conversation_type === 'external_agent';
  const receiptStatus = getReceiptStatus(conversation, currentUserId);

  return (
    <Pressable testID="conversation-row" style={styles.container} onPress={onPress}>
      <View style={styles.photoWrapper}>
        {conversation.listing_photo_url ? (
          <Image
            source={{ uri: conversation.listing_photo_url }}
            style={styles.photo}
            contentFit="cover"
          />
        ) : (
          <NoPhotoPlaceholder size="thumb" style={[styles.photo, { borderRadius: LAYOUT.radius.sm }]} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.address, hasUnread && styles.unreadText]} numberOfLines={1}>
            {conversation.listing_address || 'Listing'}
          </Text>
          <View style={styles.timeRow}>
            <Text style={styles.time}>
              {timeAgo(conversation.last_message_at)}
            </Text>
            {hasUnread && <View style={styles.unreadDot} />}
          </View>
        </View>

        {/* Subtitle: agent name or owner name */}
        {isExternal && conversation.external_agent_name ? (
          <Text style={styles.agentSubtitle} numberOfLines={1}>
            via {conversation.external_agent_name} (Agent)
          </Text>
        ) : conversation.owner_display_name ? (
          <Text style={styles.agentSubtitle} numberOfLines={1}>
            Listed by {conversation.owner_display_name}
          </Text>
        ) : null}

        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, hasUnread && styles.unreadText]}
            numberOfLines={1}
          >
            {conversation.last_message_text || 'No messages yet'}
          </Text>
          <ReadReceipt status={receiptStatus} isExternal={isExternal} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  photoWrapper: {
    marginRight: 12,
    borderRadius: LAYOUT.radius.sm + 2,
    borderWidth: 1.5,
    borderColor: COLORS.accent + '44',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: LAYOUT.radius.sm,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  address: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  agentSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.brandOrange,
    marginBottom: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontFamily: FONTS.body.semiBold,
    color: COLORS.text,
  },
});
