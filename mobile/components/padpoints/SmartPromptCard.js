import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, FadeIn, FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { getNearestCities } from '../../constants/service-areas';

const ASKPAD_ICON = require('../../assets/images/askpad-orb.png');

/**
 * Smart Prompt Card — modal overlay that appears between swipes
 * to collect preferences one question at a time. Each answer awards PadPoints.
 *
 * Option A design: centered modal with scrim, spring-in animation,
 * art-direction touches (steampunk/parchment gradient border).
 */
export default function SmartPromptCard({ prompt, onAnswer, onSkip, onAskPad }) {
  if (!prompt) return null;

  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    cardOpacity.value = withTiming(1, { duration: 250 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const handleAnswer = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Animate out then callback
    cardScale.value = withTiming(0.9, { duration: 150 });
    cardOpacity.value = withTiming(0, { duration: 150 });
    setTimeout(() => onAnswer(prompt.key, value), 180);
  };

  const handleSkip = () => {
    cardScale.value = withTiming(0.9, { duration: 120 });
    cardOpacity.value = withTiming(0, { duration: 120 });
    setTimeout(() => onSkip(), 150);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Scrim backdrop — tap to skip */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip} />

        {/* Prompt card */}
        <Animated.View style={[styles.cardOuter, cardStyle]}>
          <LinearGradient
            colors={['#1E3A5F', '#234170', '#2C5288']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Decorative top accent line */}
            <LinearGradient
              colors={['#A89050', '#C4AD78', '#DECA92', '#C4AD78', '#A89050']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentLine}
            />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>{prompt.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{prompt.title}</Text>
                <Text style={styles.question}>{prompt.question}</Text>
              </View>
            </View>

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

            {/* Reward hint */}
            <View style={styles.reward}>
              <Text style={styles.rewardPoints}>+{prompt.padpoints}</Text>
              <Text style={styles.rewardLabel}>PadPoints</Text>
              <View style={styles.rewardDot} />
              <Text style={styles.rewardHint}>{prompt.hint}</Text>
            </View>

            {/* Decorative bottom accent line */}
            <LinearGradient
              colors={['#A89050', '#C4AD78', '#DECA92', '#C4AD78', '#A89050']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentLineBottom}
            />

            {/* Ask Pad CTA (on later prompts) */}
            {prompt.afterSwipe >= 25 && onAskPad && (
              <TouchableOpacity style={styles.askPadButton} onPress={() => { handleSkip(); setTimeout(() => onAskPad(), 200); }} activeOpacity={0.7}>
                <Image source={ASKPAD_ICON} style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }} />
                <Text style={styles.askPadText}>AskPad instead</Text>
              </TouchableOpacity>
            )}

            {/* Skip */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
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
    dynamic: true, // options generated at runtime from GPS
    options: [],
    padpoints: 20,
    hint: 'Hyperlocal matches',
    prefKey: 'search_zone',
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

/**
 * Build dynamic options for location prompt based on GPS.
 * Returns the prompt with nearby cities as options.
 */
export function buildLocationPrompt(prompt, deviceLat, deviceLng) {
  if (!prompt.dynamic) return prompt;

  const nearby = getNearestCities(deviceLat, deviceLng, 4);
  if (nearby.length === 0) return null; // no GPS, skip this prompt

  const options = nearby.map(city => ({
    label: city.name,
    value: JSON.stringify({ label: `${city.name}, FL`, lat: city.lat, lng: city.lng }),
  }));

  return { ...prompt, options };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.padding.lg,
  },
  cardOuter: {
    width: '100%',
    maxWidth: 340,
    borderRadius: LAYOUT.radius.xl,
    // Outer glow
    shadowColor: '#A89050',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  card: {
    borderRadius: LAYOUT.radius.xl,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#A8905066',
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  accentLineBottom: {
    height: 2,
    width: '60%',
    alignSelf: 'center',
    borderRadius: 1,
    marginTop: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: LAYOUT.padding.lg,
    paddingTop: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding.sm,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
  },
  question: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.accent + '18',
    borderWidth: 1,
    borderColor: COLORS.accent + '66',
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
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: LAYOUT.padding.lg,
  },
  rewardPoints: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: '#FFD700',
  },
  rewardLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: '#FFD700',
  },
  rewardDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.slate,
  },
  rewardHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  askPadButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent + '15',
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: 10,
    marginHorizontal: LAYOUT.padding.lg,
    marginBottom: LAYOUT.padding.xs,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
  },
  askPadText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: LAYOUT.padding.sm,
    paddingBottom: LAYOUT.padding.md,
  },
  skipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
