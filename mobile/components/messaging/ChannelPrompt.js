/**
 * First-time channel preference prompt.
 * Shown inline before the renter's first message to capture how
 * they want to receive replies from owners and listing agents.
 *
 * Writes to profiles.preferred_channel — same field as the
 * locked Notification Settings screen.
 */

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const PROMPT_KEY = 'padmagnet_channel_prompt_shown';

export default function ChannelPrompt({ onDismiss }) {
  const [saving, setSaving] = useState(false);

  async function handleChoice(channel) {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ preferred_channel: channel })
          .eq('id', session.user.id);
      }
      await AsyncStorage.setItem(PROMPT_KEY, '1');
    } catch (err) {
      console.warn('[ChannelPrompt] Save failed:', err.message);
    }
    setSaving(false);
    onDismiss?.();
  }

  return (
    <View style={styles.container}>
      <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.accent} />
      <Text style={styles.title}>
        How would you like to hear back from property owners and listing agents?
      </Text>
      <View style={styles.options}>
        <Pressable
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          onPress={() => handleChoice('sms')}
          disabled={saving}
        >
          <Ionicons name="phone-portrait-outline" size={20} color={COLORS.accent} />
          <Text style={styles.optionLabel}>Text Me</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          onPress={() => handleChoice('email')}
          disabled={saving}
        >
          <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
          <Text style={styles.optionLabel}>Email Me</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>You can always change this in Settings</Text>
    </View>
  );
}

/** Check if the prompt has been shown before */
ChannelPrompt.hasBeenShown = async () => {
  const val = await AsyncStorage.getItem(PROMPT_KEY);
  return val === '1';
};

const styles = StyleSheet.create({
  container: {
    margin: LAYOUT.padding.md,
    padding: LAYOUT.padding.lg,
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  optionPressed: {
    opacity: 0.8,
    backgroundColor: COLORS.accent + '22',
  },
  optionLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
  },
  hint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
