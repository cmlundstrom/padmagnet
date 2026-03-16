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
 */
export default function MessageBubble({ message, isMine, isRead, isExternal }) {
  let checkmark = null;
  if (isMine) {
    if (isExternal) {
      // External: max grey double check (delivered). Never blue.
      checkmark = <Text style={[styles.check, styles.checkGrey]}>  {'\u2713\u2713'}</Text>;
    } else if (isRead || message.read_at) {
      // Internal: blue double check = read
      checkmark = <Text style={[styles.check, styles.checkBlue]}>  {'\u2713\u2713'}</Text>;
    } else {
      // Sent/delivered but not read — grey double check
      checkmark = <Text style={[styles.check, styles.checkGrey]}>  {'\u2713\u2713'}</Text>;
    }
  }

  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {/* External agent label for incoming messages */}
        {!isMine && message.sender_id === null && (
          <Text style={styles.agentLabel}>MLS Agent</Text>
        )}
        <Text style={[styles.body, isMine ? styles.bodyMine : styles.bodyTheirs]}>
          {message.body}
        </Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
          {formatTime(message.created_at)}
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
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  agentLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.brandOrange,
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
  checkGrey: {
    color: COLORS.slate,
  },
  checkBlue: {
    color: COLORS.accent,
  },
});
