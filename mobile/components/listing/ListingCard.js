import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Badge } from '../ui';
import NoPhotoPlaceholder from '../ui/NoPhotoPlaceholder';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { formatCurrency, formatBedsBaths } from '../../utils/format';

export default function ListingCard({ listing, padscore, style }) {
  const router = useRouter();

  if (!listing) return null;

  const firstPhoto = listing.photos?.[0]?.url;
  const street = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const address = [street, listing.city].filter(Boolean).join(', ');
  const score = padscore ?? listing.padScore?.score ?? null;

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => router.push(`/listing/${listing.id}`)}
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
      </View>
      <View style={styles.info}>
        <Text style={styles.price} numberOfLines={1}>
          {formatCurrency(listing.list_price)}
          <Text style={styles.perMonth}>/mo</Text>
        </Text>
        <Text style={styles.address} numberOfLines={1}>{address}</Text>
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
    height: 140,
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
  info: {
    padding: LAYOUT.padding.sm,
  },
  price: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
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
    marginTop: 2,
  },
  details: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
