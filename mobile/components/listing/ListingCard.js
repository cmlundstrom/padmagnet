import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Badge } from '../ui';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { formatCurrency, formatBedsBaths } from '../../utils/format';

export default function ListingCard({ listing, padscore, style }) {
  const router = useRouter();

  if (!listing) return null;

  const firstPhoto = listing.photos?.[0]?.url;
  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
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
          <View style={styles.placeholderWrap}>
            <Text style={styles.placeholderEmoji}>🌴</Text>
            <Text style={styles.placeholderTitle}>Photo{'\n'}Coming Soon</Text>
          </View>
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
    height: 120,
    backgroundColor: COLORS.surface,
  },
  image: {
    flex: 1,
  },
  placeholderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a5276',
  },
  placeholderEmoji: {
    fontSize: 32,
    opacity: 0.3,
    position: 'absolute',
  },
  placeholderTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 16,
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
    fontSize: FONT_SIZES.md,
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
