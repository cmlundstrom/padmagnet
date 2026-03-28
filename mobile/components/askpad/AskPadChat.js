import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useAskPad from '../../hooks/useAskPad';
import AskPadMessage from './AskPadMessage';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Ask Pad Chat — full-screen modal chat interface.
 * Text input with greyed-out mic icon ("Voice coming soon").
 * Renders message bubbles, listing cards, action buttons.
 */
export default function AskPadChat({ visible, onClose }) {
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);
  const askPad = useAskPad();

  // Auto-scroll on new messages
  useEffect(() => {
    if (askPad.messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [askPad.messages.length]);

  function handleSend() {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    askPad.sendQuery(input.trim());
    setInput('');
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="sparkles" size={16} color={COLORS.accent} />
            <Text style={styles.headerTitle}>Ask Pad</Text>
          </View>
          <View style={styles.queryCount}>
            <Text style={styles.queryText}>
              {askPad.remainingQueries >= 999 ? '∞' : askPad.remainingQueries} left
            </Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={askPad.messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <AskPadMessage message={item} />}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="sparkles" size={40} color={COLORS.accent + '44'} />
              <Text style={styles.emptyTitle}>Ask Pad anything about rentals</Text>
              <Text style={styles.emptyHint}>Try: "Find me a 2-bed dog-friendly place under $2,000 near Stuart"</Text>
            </View>
          }
        />

        {/* Typing indicator */}
        {askPad.loading && (
          <View style={styles.typingRow}>
            <View style={styles.typingDot} />
            <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
            <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
            <Text style={styles.typingText}>Ask Pad is thinking...</Text>
          </View>
        )}

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about rentals, PadScore, neighborhoods..."
              placeholderTextColor={COLORS.slate}
              multiline
              maxLength={500}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit
            />
            {/* Greyed-out mic icon */}
            <Pressable
              style={styles.micButton}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="mic" size={20} color={COLORS.border} />
            </Pressable>
            {/* Send button */}
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || askPad.loading}
            >
              <Ionicons name="arrow-up" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.voiceHint}>🎙️ Voice input coming soon</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
  },
  queryCount: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: LAYOUT.radius.full,
  },
  queryText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.brandOrange,
  },
  messageList: {
    padding: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.lg,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  emptyHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: LAYOUT.padding.lg,
    paddingVertical: LAYOUT.padding.sm,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    opacity: 0.5,
  },
  typingText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginLeft: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  voiceHint: {
    fontFamily: FONTS.body.regular,
    fontSize: 9,
    color: COLORS.slate,
    textAlign: 'center',
    paddingBottom: 4,
  },
});
