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

export default function ConversationItem({ conversation, currentUserId, onPress }) {
  const unread = conversation.tenant_user_id === currentUserId
    ? conversation.tenant_unread_count
    : conversation.owner_unread_count;

  const hasUnread = unread > 0;

  return (
    <Pressable style={styles.container} onPress={onPress}>
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
          <Text style={styles.time}>
            {timeAgo(conversation.last_message_at)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, hasUnread && styles.unreadText]}
            numberOfLines={1}
          >
            {conversation.last_message_text || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
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
  },
  photoWrapper: {
    marginRight: 12,
  },
  photo: {
    width: 52,
    height: 52,
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
  time: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
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
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: FONTS.body.bold,
    fontSize: 11,
    color: COLORS.navy,
  },
});
