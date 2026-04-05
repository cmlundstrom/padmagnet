import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import SwipeableSheet from '../../ui/SwipeableSheet';
import { EqualHousingBadge } from '../../ui';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT } from '../../../constants/layout';

/**
 * ListingPreviewSheet — shows a live preview of the listing as renters see it.
 * Wraps SwipeableSheet with a listing-card-style render from raw form state.
 *
 * Props:
 *   visible  — boolean
 *   onClose  — dismiss handler
 *   form     — current form state from useListingStudio
 */
export default function ListingPreviewSheet({ visible, onClose, form }) {
  const address = [form.street_number, form.street_name].filter(Boolean).join(' ');
  const cityLine = [form.city, form.state_or_province, form.postal_code].filter(Boolean).join(', ');
  const firstPhoto = form.photos?.[0]?.url;

  return (
    <SwipeableSheet visible={visible} onClose={onClose}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sheetTitle}>Live Preview</Text>
        <Text style={styles.sheetSubtitle}>This is how renters will see your listing</Text>

        {/* Photo */}
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.heroPhoto} contentFit="cover" />
        ) : (
          <View style={[styles.heroPhoto, styles.heroPlaceholder]}>
            <Ionicons name="camera-outline" size={40} color={COLORS.slate} />
            <Text style={styles.heroPlaceholderText}>Add photos to see them here</Text>
          </View>
        )}

        {/* Price + Type */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {form.list_price ? `$${Number(form.list_price).toLocaleString()}/mo` : '$—/mo'}
          </Text>
          {form.property_sub_type ? (
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{form.property_sub_type}</Text>
            </View>
          ) : null}
        </View>

        {/* Address */}
        <Text style={styles.address}>{address || 'Street address'}</Text>
        <Text style={styles.cityLine}>{cityLine || 'City, State, Zip'}</Text>

        {/* Specs */}
        <View style={styles.specsRow}>
          <SpecItem icon="bed-outline" value={form.bedrooms_total || '—'} label="Beds" />
          <SpecItem icon="water-outline" value={form.bathrooms_total || '—'} label="Baths" />
          <SpecItem icon="resize-outline" value={form.living_area ? `${Number(form.living_area).toLocaleString()}` : '—'} label="Sq Ft" />
          <SpecItem icon="calendar-outline" value={form.year_built || '—'} label="Built" />
        </View>

        {/* Description */}
        {form.public_remarks ? (
          <View style={styles.descSection}>
            <Text style={styles.descLabel}>Description</Text>
            <Text style={styles.descText}>{form.public_remarks}</Text>
          </View>
        ) : null}

        {/* Features */}
        <View style={styles.featuresRow}>
          {form.pets_allowed === true && <FeatureBadge label="Pet Friendly" />}
          {form.pool && <FeatureBadge label="Pool" />}
          {form.furnished && <FeatureBadge label="Furnished" />}
          {form.fenced_yard && <FeatureBadge label="Fenced Yard" />}
          {form.parking_spaces && <FeatureBadge label={`${form.parking_spaces} Parking`} />}
        </View>

        {/* Lease */}
        {form.lease_term && (
          <Text style={styles.leaseText}>Lease: {form.lease_term} months minimum</Text>
        )}
        {form.available_date && (
          <Text style={styles.leaseText}>Available: {form.available_date}</Text>
        )}

        {/* Contact */}
        {form.listing_agent_name ? (
          <View style={styles.contactSection}>
            <Ionicons name="person-circle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.contactName}>{form.listing_agent_name}</Text>
          </View>
        ) : null}

        <EqualHousingBadge style={{ marginTop: 16 }} />
      </ScrollView>
    </SwipeableSheet>
  );
}

function SpecItem({ icon, value, label }) {
  return (
    <View style={styles.specItem}>
      <Ionicons name={icon} size={18} color={COLORS.accent} />
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function FeatureBadge({ label }) {
  return (
    <View style={styles.featureBadge}>
      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: LAYOUT.padding.md, paddingBottom: 40 },
  sheetTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  heroPhoto: {
    width: '100%',
    height: 200,
    borderRadius: LAYOUT.radius.lg,
    marginBottom: 16,
  },
  heroPlaceholder: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  heroPlaceholderText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  price: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'] || 28,
    color: COLORS.text,
  },
  typeBadge: {
    backgroundColor: COLORS.accent + '22',
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.accent,
  },
  address: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  cityLine: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: 12,
    marginBottom: 16,
  },
  specItem: { alignItems: 'center', gap: 2 },
  specValue: {
    fontFamily: FONTS.body.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  specLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.textSecondary,
  },
  descSection: { marginBottom: 16 },
  descLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  descText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '15',
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featureText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
  },
  leaseText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  contactSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  contactName: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
});
