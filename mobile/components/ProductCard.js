import { View, Text, StyleSheet } from 'react-native';
import Button from './ui/Button';
import { formatPriceCents } from '../utils/format';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/fonts';
import { LAYOUT } from '../constants/layout';

export default function ProductCard({ product, onPurchase, ctaLabel = 'Buy Now', featured = false }) {
  return (
    <View style={[styles.card, featured && styles.featured]}>
      <Text style={styles.name}>{product.name}</Text>
      {product.description ? (
        <Text style={styles.description}>{product.description}</Text>
      ) : null}
      <Text style={styles.price}>{formatPriceCents(product.price_cents)}</Text>
      <Button
        title={ctaLabel}
        onPress={() => onPurchase(product)}
        size="sm"
        style={styles.cta}
      />
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
  },
  featured: {
    borderColor: COLORS.accent,
    borderWidth: 2,
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
});
