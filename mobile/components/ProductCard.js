import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Button from './ui/Button';
import { formatPriceCents } from '../utils/format';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

export default function ProductCard({ product, onPurchase, ctaLabel = 'Buy Now', featured = false }) {
  const badge = product.metadata?.badge;

  return (
    <View style={[styles.card, featured && styles.featured]}>
      {badge ? (
        <View style={styles.badge}>
          <FontAwesome name="star" size={11} color={COLORS.white} style={styles.badgeStar} />
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.name}>{product.name}</Text>
      {product.description ? (
        <Text style={styles.description}>{product.description.replace(/\\n/g, '\n')}</Text>
      ) : null}
      <Text style={styles.price}>{formatPriceCents(product.price_cents)}</Text>
      <Button
        title={ctaLabel}
        onPress={() => onPurchase(product)}
        size="sm"
        style={styles.cta}
      />
      {product.metadata?.footnote ? (
        <Text style={styles.footnote}>*{product.metadata.footnote}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.md,
    marginBottom: 12,
    overflow: 'hidden',
  },
  featured: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandOrange,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomLeftRadius: LAYOUT.radius.md,
    gap: 4,
    zIndex: 10,
  },
  badgeStar: {
    marginTop: -1,
  },
  badgeText: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: 6,
  },
  description: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  price: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.accent,
    marginBottom: 12,
  },
  cta: {
    alignSelf: 'flex-start',
  },
  footnote: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    color: COLORS.slate,
    marginTop: 10,
    lineHeight: 16,
  },
});
