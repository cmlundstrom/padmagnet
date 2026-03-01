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

export default function MessageBubble({ message, isMine }) {
  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.body, isMine ? styles.bodyMine : styles.bodyTheirs]}>
          {message.body}
        </Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
          {formatTime(message.created_at)}
          {isMine && message.read && '  ✓'}
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
    fontSize: 10,
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
});
