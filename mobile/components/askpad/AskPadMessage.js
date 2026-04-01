import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * Individual Ask Pad message bubble.
 * Renders: text, listings cards, rebuffs, cooldown, errors, limit_reached (with upgrade CTA).
 */
export default function AskPadMessage({ message, onUpgrade, onPreferences, onViewListing }) {
  const isUser = message.role === 'user';
  const isRebuff = message.type === 'rebuff';
  const isCooldown = message.type === 'cooldown';
  const isError = message.type === 'error';
  const isLimit = message.type === 'limit_reached';
  const hasListings = message.listings && message.listings.length > 0;

  return (
    <Animated.View
      style={[styles.row, isUser && styles.rowUser]}
      entering={FadeInUp.springify().damping(14).delay(isUser ? 0 : 150)}
    >
      {/* Avatar */}
      {!isUser && (
        <Image source={require('../../assets/images/askpad-orb.png')} style={styles.avatar} />
      )}

      {/* Bubble */}
      <View style={[
        styles.bubble,
        isUser && styles.bubbleUser,
        isRebuff && styles.bubbleRebuff,
        isCooldown && styles.bubbleCooldown,
        isError && styles.bubbleError,
        isLimit && styles.bubbleLimit,
        hasListings && styles.bubbleListings,
      ]}>
        <Text style={[
          styles.text,
          isUser && styles.textUser,
          isRebuff && styles.textRebuff,
          isLimit && styles.textLimit,
        ]}>
          {message.text}
        </Text>

        {/* Listing result cards */}
        {hasListings && (
          <View style={styles.listingCards}>
            {message.listings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={styles.listingCard}
                onPress={() => onViewListing && onViewListing(listing.id)}
                activeOpacity={0.7}
              >
                {listing.photo && (
                  <Image source={{ uri: listing.photo }} style={styles.listingPhoto} />
                )}
                <View style={styles.listingInfo}>
                  <Text style={styles.listingPrice}>${listing.rent ? listing.rent.toLocaleString() : '?'}/mo</Text>
                  <Text style={styles.listingAddress} numberOfLines={1}>
                    {listing.address}, {listing.city}
                  </Text>
                  <Text style={styles.listingMeta}>
                    {listing.beds}bd · {listing.baths}ba{listing.sqft ? ` · ${listing.sqft.toLocaleString()} sqft` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.slate} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CTAs for limit_reached */}
        {isLimit && (
          <View style={styles.limitActions}>
            {onUpgrade && (
              <TouchableOpacity onPress={onUpgrade} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#FF8C42', COLORS.brandOrange, '#C94A1E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.upgradeGradient}
                >
                  <Text style={styles.upgradeText}>Upgrade AskPad from $1.50/mo.</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {onPreferences && (
              <TouchableOpacity onPress={onPreferences} activeOpacity={0.8} style={styles.prefsButton}>
                <Text style={styles.prefsText}>Tune Your PadScore — FREE</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {message.abuseWarning && (
          <Text style={styles.abuseWarning}>{message.abuseWarning}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
    maxWidth: '100%',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  bubbleLimit: {
    backgroundColor: COLORS.brandOrange + '12',
    borderColor: COLORS.brandOrange + '44',
    maxWidth: '85%',
    borderBottomLeftRadius: LAYOUT.radius.lg,
  },
  bubbleListings: {
    maxWidth: '85%',
    borderBottomLeftRadius: LAYOUT.radius.lg,
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
  textLimit: {
    color: COLORS.brandOrange,
    textAlign: 'center',
  },
  // ── Listing cards ──────────────────────────
  listingCards: {
    marginTop: 10,
    gap: 8,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listingPhoto: {
    width: 64,
    height: 64,
  },
  listingInfo: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  listingPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.brandOrange,
  },
  listingAddress: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    marginTop: 2,
  },
  listingMeta: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    marginTop: 2,
  },
  // ── Limit / upgrade ────────────────────────
  limitActions: {
    marginTop: 10,
    gap: 8,
  },
  upgradeGradient: {
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeText: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  prefsButton: {
    backgroundColor: COLORS.accent + '18',
    borderRadius: LAYOUT.radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  prefsText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  abuseWarning: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    marginTop: 8,
  },
});
