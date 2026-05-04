import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Badge } from '../ui';
import NoPhotoPlaceholder from '../ui/NoPhotoPlaceholder';
import TierBadge from '../owner/TierBadge';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { formatCurrency, formatBedsBaths } from '../../utils/format';

export default function ListingCard({ listing, padscore, style, context }) {
  const router = useRouter();

  if (!listing) return null;

  const firstPhoto = listing.photos?.[0]?.url;
  const street = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const score = padscore ?? listing.padScore?.score ?? null;
  const hasPriceDrop = listing.previous_list_price && listing.price_changed_at
    && listing.list_price < listing.previous_list_price
    && (Date.now() - new Date(listing.price_changed_at).getTime()) < 7 * 86400000;

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => router.push(`/listing/${listing.id}${context ? `?context=${context}` : ''}`)}
    >
      <View style={styles.imageContainer}>
        {firstPhoto ? (
          <Image
            source={{ uri: firstPhoto }}
            style={styles.image}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
        ) : (
          <NoPhotoPlaceholder size="card" />
        )}
        {score != null && (
          <View style={styles.scoreBadge}>
            <Badge score={score} size="sm" />
          </View>
        )}
        {listing.owner_tier && listing.owner_tier !== 'free' && (
          <View style={styles.tierBadgeContainer}>
            <TierBadge tier={listing.owner_tier} size="sm" />
          </View>
        )}
        {hasPriceDrop && (
          <View style={styles.priceDropBadge}>
            <FontAwesome name="arrow-down" size={8} color={COLORS.white} />
            <Text style={styles.priceDropText}>Price Drop</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.price} numberOfLines={1}>
          {formatCurrency(listing.list_price)}
          <Text style={styles.perMonth}>/mo</Text>
        </Text>
        <Text style={styles.address} numberOfLines={1}>{street}</Text>
        {listing.city && <Text style={styles.city} numberOfLines={1}>{listing.city}</Text>}
        <Text style={styles.details} numberOfLines={1}>
          {formatBedsBaths(listing.bedrooms_total, listing.bathrooms_total)}
          {listing.living_area ? ` · ${Number(listing.living_area).toLocaleString()} sqft` : ''}
          {listing.days_on_market != null ? ` · ${listing.days_on_market}d` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageContainer: {
    height: 150,
    backgroundColor: COLORS.surface,
  },
  image: {
    flex: 1,
  },
  scoreBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  tierBadgeContainer: {
    position: 'absolute',
    top: 36,
    right: 6,
    zIndex: 5,
  },
  priceDropBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  priceDropText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.white,
  },
  info: {
    padding: LAYOUT.padding.md,
  },
  price: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  perMonth: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  address: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  city: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  details: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 3,
  },
});
