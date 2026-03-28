import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Individual Ask Pad message bubble.
 * Renders: text, rebuffs (styled differently), cooldown, errors.
 * Future: inline listing cards, action buttons.
 */
export default function AskPadMessage({ message }) {
  const isUser = message.role === 'user';
  const isRebuff = message.type === 'rebuff';
  const isCooldown = message.type === 'cooldown';
  const isError = message.type === 'error';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {/* Avatar */}
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={14} color={COLORS.accent} />
        </View>
      )}

      {/* Bubble */}
      <View style={[
        styles.bubble,
        isUser && styles.bubbleUser,
        isRebuff && styles.bubbleRebuff,
        isCooldown && styles.bubbleCooldown,
        isError && styles.bubbleError,
      ]}>
        <Text style={[
          styles.text,
          isUser && styles.textUser,
          isRebuff && styles.textRebuff,
        ]}>
          {message.text}
        </Text>
        {message.abuseWarning && (
          <Text style={styles.abuseWarning}>{message.abuseWarning}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderBottomLeftRadius: LAYOUT.radius.xs,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleUser: {
    backgroundColor: COLORS.accent,
    borderBottomLeftRadius: LAYOUT.radius.lg,
    borderBottomRightRadius: LAYOUT.radius.xs,
    borderColor: COLORS.accent,
  },
  bubbleRebuff: {
    backgroundColor: COLORS.brandOrange + '15',
    borderColor: COLORS.brandOrange + '33',
  },
  bubbleCooldown: {
    backgroundColor: COLORS.danger + '15',
    borderColor: COLORS.danger + '33',
  },
  bubbleError: {
    backgroundColor: COLORS.danger + '15',
    borderColor: COLORS.danger + '33',
  },
  text: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    lineHeight: 20,
  },
  textUser: {
    color: COLORS.white,
  },
  textRebuff: {
    color: COLORS.brandOrange,
  },
  abuseWarning: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    marginTop: 8,
  },
});
