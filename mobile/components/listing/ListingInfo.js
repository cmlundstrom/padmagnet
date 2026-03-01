import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { formatCurrency, formatBedsBaths, formatDate } from '../../utils/format';

export default function ListingInfo({ listing }) {
  if (!listing) return null;

  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province, listing.postal_code].filter(Boolean).join(', ');

  const details = [
    { label: 'Beds', value: listing.bedrooms_total === 0 ? 'Studio' : listing.bedrooms_total },
    { label: 'Baths', value: listing.bathrooms_total },
    { label: 'Sqft', value: listing.living_area ? Number(listing.living_area).toLocaleString() : '—' },
    { label: 'Year', value: listing.year_built || '—' },
  ];

  const features = [];
  if (listing.property_sub_type) features.push({ label: 'Type', value: listing.property_sub_type });
  if (listing.lease_term) features.push({ label: 'Lease', value: `${listing.lease_term} mo` });
  if (listing.pets_allowed === true) features.push({ label: 'Pets', value: 'Allowed' });
  else if (listing.pets_allowed === false) features.push({ label: 'Pets', value: 'Not allowed' });
  if (listing.furnished === true) features.push({ label: 'Furnished', value: 'Yes' });
  else if (listing.furnished === false) features.push({ label: 'Furnished', value: 'No' });
  if (listing.hoa_fee) features.push({ label: 'HOA', value: formatCurrency(listing.hoa_fee) + '/mo' });
  if (listing.fenced_yard) features.push({ label: 'Yard', value: 'Fenced' });

  return (
    <View style={styles.container}>
      {/* Price + Address */}
      <View style={styles.section}>
        <Text style={styles.price}>
          {formatCurrency(listing.list_price)}
          <Text style={styles.perMonth}>/mo</Text>
        </Text>
        <Text style={styles.address}>{address}</Text>
        <Text style={styles.city}>{cityLine}</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {details.map(item => (
          <View key={item.label} style={styles.statItem}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Features */}
      {features.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {features.map(item => (
            <View key={item.label} style={styles.featureRow}>
              <Text style={styles.featureLabel}>{item.label}</Text>
              <Text style={styles.featureValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Description */}
      {listing.public_remarks && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.public_remarks}</Text>
        </View>
      )}

      {/* Listing meta */}
      {listing.created_at && (
        <View style={styles.section}>
          <Text style={styles.meta}>
            Listed {formatDate(listing.created_at)}
            {listing.listing_id ? ` · MLS# ${listing.listing_id}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.md,
  },
  section: {
    marginBottom: LAYOUT.padding.md,
  },
  price: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
  },
  perMonth: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  address: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginTop: 4,
  },
  city: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  statLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  featureLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  featureValue: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  description: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  meta: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
});
