import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Smart Prompt Card — appears inline in the swipe deck to collect
 * preferences one question at a time. Each answer awards PadPoints.
 *
 * Designed to look like a special listing card with a branded gradient.
 */
export default function SmartPromptCard({ prompt, onAnswer, onSkip }) {
  if (!prompt) return null;

  const handleAnswer = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAnswer(prompt.key, value);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{prompt.emoji}</Text>
        <Text style={styles.title}>{prompt.title}</Text>
      </View>

      {/* Question */}
      <Text style={styles.question}>{prompt.question}</Text>

      {/* Options */}
      <View style={styles.options}>
        {prompt.options.map((option, i) => (
          <TouchableOpacity
            key={i}
            style={styles.option}
            onPress={() => handleAnswer(option.value)}
            activeOpacity={0.7}
          >
            {option.emoji && <Text style={styles.optionEmoji}>{option.emoji}</Text>}
            <Text style={styles.optionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PadPoints reward */}
      <View style={styles.reward}>
        <Text style={styles.rewardText}>+{prompt.padpoints} PadPoints</Text>
        <Text style={styles.rewardHint}>{prompt.hint}</Text>
      </View>

      {/* Skip */}
      <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Smart Prompt definitions — the questions asked at each interval.
 * Each prompt appears after a specific number of swipes.
 */
export const SMART_PROMPTS = [
  {
    key: 'budget',
    afterSwipe: 3,
    emoji: '✨',
    title: 'Quick Match Boost',
    question: "What's your max monthly rent?",
    options: [
      { label: '$1,500', value: 1500 },
      { label: '$2,000', value: 2000 },
      { label: '$2,500', value: 2500 },
      { label: '$3,000', value: 3000 },
      { label: '$3,500+', value: 3500 },
    ],
    padpoints: 15,
    hint: 'Better matches ahead',
    prefKey: 'budget_max',
  },
  {
    key: 'pets',
    afterSwipe: 8,
    emoji: '🐾',
    title: 'Got any furry friends?',
    question: 'Do you have pets?',
    options: [
      { label: 'Dog', value: 'dog', emoji: '🐕' },
      { label: 'Cat', value: 'cat', emoji: '🐈' },
      { label: 'Both', value: 'both', emoji: '🐾' },
      { label: 'No pets', value: 'none' },
    ],
    padpoints: 15,
    hint: 'Filters pet-friendly homes',
    prefKey: 'pets_required',
  },
  {
    key: 'beds',
    afterSwipe: 15,
    emoji: '🛏️',
    title: 'Room to grow',
    question: 'Minimum bedrooms?',
    options: [
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '3', value: 3 },
      { label: '4+', value: 4 },
    ],
    padpoints: 10,
    hint: 'Narrows your search',
    prefKey: 'beds_min',
  },
  {
    key: 'location',
    afterSwipe: 25,
    emoji: '📍',
    title: 'Your neighborhood',
    question: 'Where are you looking?',
    options: [
      { label: 'Stuart', value: 'Stuart' },
      { label: 'Palm City', value: 'Palm City' },
      { label: 'Jensen Beach', value: 'Jensen Beach' },
      { label: 'Hobe Sound', value: 'Hobe Sound' },
      { label: 'Other', value: 'other' },
    ],
    padpoints: 20,
    hint: 'Hyperlocal matches',
    prefKey: 'preferred_city',
  },
  {
    key: 'type',
    afterSwipe: 40,
    emoji: '🏠',
    title: 'Your style',
    question: 'Property type preference?',
    options: [
      { label: 'House', value: 'Single Family' },
      { label: 'Apartment', value: 'Apartment' },
      { label: 'Condo', value: 'Condo' },
      { label: 'Townhouse', value: 'Townhouse' },
      { label: 'Any', value: 'any' },
    ],
    padpoints: 10,
    hint: 'Refines your feed',
    prefKey: 'property_type',
  },
  {
    key: 'features',
    afterSwipe: 60,
    emoji: '⚡',
    title: 'Nice to haves',
    question: 'Any must-haves?',
    options: [
      { label: 'Furnished', value: 'furnished' },
      { label: 'No HOA', value: 'no_hoa' },
      { label: 'Pool', value: 'pool' },
      { label: 'Fenced yard', value: 'fenced' },
      { label: 'No preference', value: 'none' },
    ],
    padpoints: 10,
    hint: 'Fine-tunes PadScore',
    prefKey: 'features',
  },
];

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.lg,
    borderWidth: 2,
    borderColor: COLORS.accent + '44',
    width: LAYOUT.card.width,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: LAYOUT.padding.md,
  },
  emoji: {
    fontSize: 24,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
  },
  question: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: LAYOUT.padding.md,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: LAYOUT.padding.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.accent + '22',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  optionEmoji: {
    fontSize: 16,
  },
  optionText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: LAYOUT.padding.sm,
  },
  rewardText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  rewardHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.sm,
  },
  skipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
