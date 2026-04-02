import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Pressable, Keyboard, Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';
import useAskPad from '../../hooks/useAskPad';
import AskPadMessage from './AskPadMessage';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { EqualHousingBadge } from '../ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Panel top offset — show ~10% of listings behind (was 20%, tightened for more chat room)
const PANEL_TOP = Math.round(SCREEN_HEIGHT * 0.10);

/** Animated typing indicator — three dots pulse sequentially */
function TypingIndicator() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    function loop() {
      dot1.value = withTiming(1, { duration: 400 }, () => {
        dot1.value = withTiming(0.3, { duration: 400 });
      });
      setTimeout(() => {
        dot2.value = withTiming(1, { duration: 400 }, () => {
          dot2.value = withTiming(0.3, { duration: 400 });
        });
      }, 200);
      setTimeout(() => {
        dot3.value = withTiming(1, { duration: 400 }, () => {
          dot3.value = withTiming(0.3, { duration: 400 });
        });
      }, 400);
    }
    loop();
    const interval = setInterval(loop, 1200);
    return () => clearInterval(interval);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value, transform: [{ scale: 0.8 + dot1.value * 0.3 }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value, transform: [{ scale: 0.8 + dot2.value * 0.3 }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value, transform: [{ scale: 0.8 + dot3.value * 0.3 }] }));

  return (
    <View style={styles.typingRow}>
      <Animated.View style={[styles.typingDot, s1]} />
      <Animated.View style={[styles.typingDot, s2]} />
      <Animated.View style={[styles.typingDot, s3]} />
      <Text style={styles.typingText}>AskPad is thinking...</Text>
    </View>
  );
}

/**
 * AskPad Chat — "The Lens" frosted glass overlay.
 * Slide-up panel over the swipe cards with blurred backdrop.
 * Input bar visible immediately. Keyboard lifts the panel.
 */
export default function AskPadChat({ visible, onClose, onUpgrade, onPreferences, onNotifications, onViewListing, onQuerySent, deviceLat, deviceLng }) {
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);
  const askPad = useAskPad({ deviceLat, deviceLng });
  const [nearbyCity, setNearbyCity] = useState(null);

  // Swipe-to-dismiss gesture — also handles open/close animation
  const panelTranslateY = useSharedValue(SCREEN_HEIGHT);
  const DISMISS_THRESHOLD = 120;

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      panelTranslateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        panelTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
          runOnJS(handleClose)();
        });
      } else {
        panelTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const panelDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelTranslateY.value }],
  }));

  // Animate in when visible, reset when hidden
  useEffect(() => {
    if (visible) {
      panelTranslateY.value = SCREEN_HEIGHT;
      panelTranslateY.value = withSpring(0, { damping: 18, stiffness: 140 });
    }
  }, [visible]);

  // Reverse geocode to get city name for dynamic chips
  useEffect(() => {
    if (!deviceLat || !deviceLng) return;
    (async () => {
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: deviceLat, longitude: deviceLng });
        if (results && results[0] && results[0].city) {
          setNearbyCity(results[0].city);
        }
      } catch {}
    })();
  }, [deviceLat, deviceLng]);

  const starterChips = useMemo(() => {
    const city = nearbyCity || 'your area';
    return [
      `3BR under $3,000 near ${city}`,
      'What areas have the lowest rent?',
      `Show me places with a pool near ${city}`,
      `Show me rentals near downtown ${city}`,
    ];
  }, [nearbyCity]);


  // Auto-scroll on new messages + notify parent of query count change
  useEffect(() => {
    if (askPad.messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      onQuerySent && onQuerySent();
    }
  }, [askPad.messages.length]);

  // Scroll to bottom when chat becomes visible (e.g., returning from listing detail)
  useEffect(() => {
    if (visible && askPad.messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
    }
  }, [visible]);

  function handleSend() {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    askPad.sendQuery(input.trim());
    setInput('');
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Frosted glass backdrop — tap to close */}
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.scrim} />
      </Pressable>

      {/* Chat panel — swipe down to dismiss */}
      <Animated.View
        style={[styles.panel, panelDragStyle]}
      >
        {/* Drag handle — swipe down to dismiss */}
        <GestureDetector gesture={panGesture}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/askpad-orb.png')}
            style={styles.headerOrb}
          />
          <Text style={styles.headerTitle}>Ai Powered Rent Search</Text>
          <View style={styles.queryCount}>
            <Text style={styles.queryText}>
              {askPad.remainingQueries === null ? '…' : askPad.remainingQueries >= 999 ? '∞' : askPad.remainingQueries} left
            </Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={askPad.messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <AskPadMessage message={item} onUpgrade={onUpgrade} onPreferences={onPreferences} onNotifications={onNotifications} onViewListing={onViewListing} />}
          contentContainerStyle={styles.messageList}
          style={styles.messageContainer}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Image source={require('../../assets/images/askpad-orb.png')} style={styles.emptyOrbImage} />
              <Text style={styles.emptyTitle}>AskPad anything about rentals</Text>
              <Text style={styles.emptyHint}>Tap a suggestion or type your own:</Text>
              <View style={styles.chipGroup}>
                {starterChips.map((prompt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.chip}
                    onPress={() => { setInput(prompt); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <EqualHousingBadge style={{ marginTop: 10 }} />
            </View>
          }
        />

        {/* Typing indicator — animated pulsing dots */}
        {askPad.loading && <TypingIndicator />}

        {/* Input bar — always visible */}
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
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || askPad.loading}
            >
              <Ionicons name="arrow-up" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <Pressable
              style={styles.micButton}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="mic" size={18} color={COLORS.border} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 25, 50, 0.3)',
  },
  panel: {
    position: 'absolute',
    top: PANEL_TOP,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: LAYOUT.radius.xl,
    borderTopRightRadius: LAYOUT.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border + '66',
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 24,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.slate,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  headerOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    flex: 1,
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
  messageContainer: {
    flex: 1,
  },
  messageList: {
    padding: LAYOUT.padding.md,
    paddingBottom: LAYOUT.padding.sm,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  emptyOrbImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  emptyTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 17,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: LAYOUT.padding.md,
    marginTop: 6,
  },
  chip: {
    backgroundColor: COLORS.accent + '18',
    borderRadius: LAYOUT.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
  },
  chipText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: LAYOUT.padding.lg,
    paddingVertical: LAYOUT.padding.sm,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#93c5fd',
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
    gap: 6,
    paddingHorizontal: LAYOUT.padding.sm,
    paddingVertical: LAYOUT.padding.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  inputActions: {
    gap: 6,
    alignItems: 'center',
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
});
