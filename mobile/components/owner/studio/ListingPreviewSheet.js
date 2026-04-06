import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import SwipeableSheet from '../../ui/SwipeableSheet';
import { EqualHousingBadge } from '../../ui';
import { COLORS } from '../../../constants/colors';
import { FONTS, FONT_SIZES } from '../../../constants/fonts';
import { LAYOUT } from '../../../constants/layout';

const { height: SCREEN_H } = Dimensions.get('window');

/**
 * ListingPreviewSheet — frosted glass live preview of the listing.
 * Studio content bleeds through the translucent background.
 */
export default function ListingPreviewSheet({ visible, onClose, form }) {
  const address = [form.street_number, form.street_name].filter(Boolean).join(' ');
  const cityLine = [form.city, form.state_or_province, form.postal_code].filter(Boolean).join(', ');
  const firstPhoto = form.photos?.[0]?.url;

  return (
    <SwipeableSheet visible={visible} onClose={onClose} sheetStyle={styles.sheetOverride}>
      {/* Custom handle — capsule + chevron */}
      <View style={styles.handleArea}>
        <View style={styles.handleCapsule} />
        <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.35)" style={{ marginTop: 2 }} />
      </View>

      {/* Gradient header band */}
      <LinearGradient
        colors={['rgba(11,29,58,0.6)', 'transparent']}
        style={styles.headerBand}
      >
        <Text style={styles.sheetTitle}>Live Preview</Text>
        <Text style={styles.sheetSubtitle}>This is how renters will see your listing</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo hero with inner shadow */}
        {firstPhoto ? (
          <View style={styles.heroWrap}>
            <Image source={{ uri: firstPhoto }} style={styles.heroPhoto} contentFit="cover" />
            {/* Inner shadow overlay at bottom of photo */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={styles.heroShadow}
            />
          </View>
        ) : (
          <View style={[styles.heroWrap, styles.heroPlaceholder]}>
            <Ionicons name="camera-outline" size={40} color={COLORS.slate} />
            <Text style={styles.heroPlaceholderText}>Add photos to see them here</Text>
          </View>
        )}

        {/* Price + Type */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {form.list_price ? `$${Number(form.list_price).toLocaleString()}/mo` : '$\u2014/mo'}
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

        {/* Specs — glass card within glass */}
        <BlurView intensity={20} tint="dark" style={styles.specsBlur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.specsRow}>
            <SpecItem icon="bed-outline" value={form.bedrooms_total || '\u2014'} label="Beds" />
            <SpecItem icon="water-outline" value={form.bathrooms_total || '\u2014'} label="Baths" />
            <SpecItem icon="resize-outline" value={form.living_area ? `${Number(form.living_area).toLocaleString()}` : '\u2014'} label="Sq Ft" />
            <SpecItem icon="calendar-outline" value={form.year_built || '\u2014'} label="Built" />
          </View>
        </BlurView>

        {/* Description */}
        {form.public_remarks ? (
          <View style={styles.descSection}>
            <Text style={styles.descLabel}>Description</Text>
            <Text style={styles.descText}>{form.public_remarks}</Text>
          </View>
        ) : null}

        {/* Features — glass border badges */}
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

      {/* Bottom fade — hints at more content */}
      <LinearGradient
        colors={['transparent', 'rgba(26,51,88,0.95)']}
        style={styles.bottomFade}
        pointerEvents="none"
      />
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
  sheetOverride: {
    minHeight: SCREEN_H * 0.75,
    backgroundColor: 'rgba(26,51,88,0.90)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 6,
  },
  handleCapsule: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  // Gradient header band
  headerBand: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: 8,
    paddingBottom: 12,
  },
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
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingBottom: 60,
  },
  // Photo hero with inner shadow
  heroWrap: {
    width: '100%',
    height: 200,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  heroShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  heroPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(52,100,160,0.4)',
    borderStyle: 'dashed',
  },
  heroPlaceholderText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.slate,
    marginTop: 8,
  },
  // Price — brand orange
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  price: {
    fontFamily: FONTS.heading.bold,
    fontSize: 28,
    color: COLORS.logoOrange,
  },
  typeBadge: {
    backgroundColor: COLORS.accent + '22',
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
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
  // Specs — glass card within glass
  specsBlur: {
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,100,160,0.3)',
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
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
  // Description
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
  // Feature badges — glass border
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
    backgroundColor: COLORS.success + '12',
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
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
    borderTopColor: 'rgba(52,100,160,0.3)',
  },
  contactName: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  // Bottom fade
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
