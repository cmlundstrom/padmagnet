import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

function formatTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Props:
 *   message       - message object
 *   isMine        - boolean: did current user send this?
 *   isRead        - boolean: has counterparty read this message?
 *   isExternal    - boolean: is this an external agent conversation?
 *   agentName     - string: external agent name (for label on their messages)
 */
export default function MessageBubble({ message, isMine, isRead, senderLabel }) {
  // Delivery channel indicator — show on any message delivered via SMS or email
  const channelLabel = message.channel && message.channel !== 'in_app'
    ? ` via ${message.channel === 'sms' ? 'SMS' : 'email'}`
    : '';

  let checkmark = null;
  if (isMine) {
    const status = message.delivery_status;
    if (status === 'failed') {
      checkmark = <Text style={[styles.check, { color: COLORS.danger }]}>  !</Text>;
    } else if (isRead || message.read_at) {
      // Read by counterparty — green double check (internal only)
      checkmark = <Text style={[styles.check, styles.checkRead]}>  {'\u2713\u2713'}</Text>;
    } else if (status === 'delivered' || status === 'sent') {
      // Notification delivered/sent — orange double check
      checkmark = <Text style={[styles.check, styles.checkDelivered]}>  {'\u2713\u2713'}</Text>;
    } else {
      // Pending or in-app only — single check (stored on server)
      checkmark = <Text style={[styles.check, styles.checkSent]}>  {'\u2713'}</Text>;
    }
  }

  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {/* Sender label — perspective-aware, computed by conversation screen */}
        {senderLabel && (
          <Text style={styles.agentLabel}>{senderLabel}</Text>
        )}
        <Text style={[styles.body, isMine ? styles.bodyMine : styles.bodyTheirs]}>
          {message.body}
        </Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
          {formatTime(message.created_at)}
          {channelLabel ? <Text style={styles.channelLabel}>{channelLabel}</Text> : null}
          {checkmark}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: LAYOUT.padding.md,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: LAYOUT.radius.md,
  },
  bubbleMine: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#162D4E',
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: '#3B6AA0',
  },
  agentLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: '#C9B06A',
    marginBottom: 2,
  },
  body: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  bodyMine: {
    fontFamily: FONTS.body.regular,
    color: COLORS.navy,
  },
  bodyTheirs: {
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
  },
  time: {
    fontSize: FONT_SIZES.xxs,
    marginTop: 4,
    textAlign: 'right',
  },
  timeMine: {
    fontFamily: FONTS.body.regular,
    color: COLORS.navy + '88',
  },
  timeTheirs: {
    fontFamily: FONTS.body.regular,
    color: COLORS.slate,
  },
  check: {
    fontSize: FONT_SIZES.xxs,
  },
  checkSent: {
    color: '#E0E7EE',
  },
  checkDelivered: {
    color: '#FFC107',
  },
  checkRead: {
    color: '#4CAF50',
  },
  channelLabel: {
    fontSize: FONT_SIZES.xs,
    color: '#90CAF9',
  },
});
