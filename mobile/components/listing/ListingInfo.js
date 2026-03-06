import { useState } from 'react';
import { View, Text, StyleSheet, Linking, Pressable } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { formatCurrency, formatDate } from '../../utils/format';
import { parseAutolinks } from '../../utils/autolink';
import useDisplayFields from '../../hooks/useDisplayFields';

const SECTION_ORDER = ['hero', 'stats', 'features', 'contact', 'agent'];
const SECTION_TITLES = {
  hero: null,
  stats: null,
  features: 'Details',
  contact: 'Contact',
  agent: 'Listed By',
};

function getLabel(field, listing) {
  const opts = field.format_options || {};
  if (opts.label_by_source && listing?.source) {
    return opts.label_by_source[listing.source] || field.label;
  }
  return field.label;
}

function getFieldValue(listing, field) {
  const val = listing[field.canonical_column];
  if (val === null || val === undefined || val === '') return null;
  return val;
}

// --- Render type handlers ---

function RenderStat({ field, listing }) {
  const val = getFieldValue(listing, field);
  if (val === null) return null;
  const opts = field.format_options || {};
  let display = val;
  if (opts.studio_if_zero && (val === 0 || val === '0')) display = 'Studio';
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{display}</Text>
      <Text style={styles.statLabel}>{field.label}</Text>
    </View>
  );
}

function RenderBoolean({ field, listing }) {
  const val = getFieldValue(listing, field);
  if (val === null) return null;
  const opts = field.format_options || {};
  const display = val ? (opts.true_text || 'Yes') : (opts.false_text || 'No');
  return (
    <FeatureRow label={getLabel(field, listing)} value={display} />
  );
}

function RenderCurrency({ field, listing }) {
  const val = getFieldValue(listing, field);
  if (val === null) return null;
  const opts = field.format_options || {};
  return (
    <FeatureRow label={getLabel(field, listing)} value={formatCurrency(val) + (opts.suffix || '')} />
  );
}

function RenderNumber({ field, listing }) {
  const val = getFieldValue(listing, field);
  if (val === null) return null;
  const opts = field.format_options || {};
  return (
    <FeatureRow label={getLabel(field, listing)} value={Number(val).toLocaleString() + (opts.suffix || '')} />
  );
}

function RenderDate({ field, listing }) {
  const val = getFieldValue(listing, field);
  if (val === null) return null;
  return (
    <FeatureRow label={getLabel(field, listing)} value={formatDate(val)} />
  );
}

function RenderLink({ field, listing }) {
  const val = getFieldValue(listing, field);
  if (val === null) return null;
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureLabel}>{getLabel(field, listing)}</Text>
      <Text style={styles.link} onPress={() => Linking.openURL(val)}>View</Text>
    </View>
  );
}

function RenderAutolink({ field, listing }) {
  const val = getFieldValue(listing, field);
  if (val === null) return null;
  return <AutolinkedText text={val} />;
}

function CollapsibleText({ text, maxLines }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View>
      <Text
        style={styles.description}
        numberOfLines={expanded ? undefined : maxLines}
      >
        {text}
      </Text>
      {text.length > 120 && (
        <Pressable onPress={() => setExpanded(!expanded)}>
          <Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      )}
    </View>
  );
}

function RenderText({ field, listing }) {
  const val = getFieldValue(listing, field);
  if (val === null) return null;
  const opts = field.format_options || {};
  const display = val + (opts.suffix || '');
  if (opts.collapsible) {
    return <CollapsibleText text={display} maxLines={4} />;
  }
  // For hero section text, show as paragraph
  if (field.section === 'hero') {
    return <Text style={styles.description}>{display}</Text>;
  }
  return (
    <FeatureRow label={getLabel(field, listing)} value={display} />
  );
}

function FeatureRow({ label, value }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureValue}>{value}</Text>
    </View>
  );
}

function FieldRenderer({ field, listing }) {
  switch (field.render_type) {
    case 'stat':     return <RenderStat field={field} listing={listing} />;
    case 'boolean':  return <RenderBoolean field={field} listing={listing} />;
    case 'currency': return <RenderCurrency field={field} listing={listing} />;
    case 'number':   return <RenderNumber field={field} listing={listing} />;
    case 'date':     return <RenderDate field={field} listing={listing} />;
    case 'link':     return <RenderLink field={field} listing={listing} />;
    case 'autolink': return <RenderAutolink field={field} listing={listing} />;
    case 'text':
    default:         return <RenderText field={field} listing={listing} />;
  }
}

function StatsGrid({ fields, listing }) {
  const visibleStats = fields.filter(f => getFieldValue(listing, f) !== null);
  if (visibleStats.length === 0) return null;
  return (
    <View style={styles.statsGrid}>
      {visibleStats.map(f => (
        <FieldRenderer key={f.output_key} field={f} listing={listing} />
      ))}
    </View>
  );
}

function SectionBlock({ title, fields, listing }) {
  // Filter out fields with null values
  const visibleFields = fields.filter(f => getFieldValue(listing, f) !== null);
  if (visibleFields.length === 0) return null;
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {visibleFields.map(f => (
        <FieldRenderer key={f.output_key} field={f} listing={listing} />
      ))}
    </View>
  );
}

function AutolinkedText({ text }) {
  const segments = parseAutolinks(text);
  return (
    <Text style={styles.description}>
      {segments.map((seg, i) => {
        if (seg.type === 'url' || seg.type === 'phone') {
          return (
            <Text key={i} style={styles.link} onPress={() => Linking.openURL(seg.href)}>
              {seg.text}
            </Text>
          );
        }
        return seg.text;
      })}
    </Text>
  );
}

export default function ListingInfo({ listing }) {
  const { fieldsBySection, loading } = useDisplayFields();

  if (!listing) return null;

  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province, listing.postal_code].filter(Boolean).join(', ');

  return (
    <View style={styles.container}>
      {/* Price + Address — always hardcoded */}
      <View style={styles.section}>
        <Text style={styles.price}>
          {formatCurrency(listing.list_price)}
          <Text style={styles.perMonth}>/mo</Text>
        </Text>
        <Text style={styles.address}>{address}</Text>
        <Text style={styles.city}>{cityLine}</Text>
      </View>

      {/* Config-driven sections */}
      {!loading && SECTION_ORDER.map(sectionKey => {
        const sectionFields = fieldsBySection[sectionKey];
        if (!sectionFields || sectionFields.length === 0) return null;

        if (sectionKey === 'stats') {
          return <StatsGrid key={sectionKey} fields={sectionFields} listing={listing} />;
        }

        return (
          <SectionBlock
            key={sectionKey}
            title={SECTION_TITLES[sectionKey]}
            fields={sectionFields}
            listing={listing}
          />
        );
      })}

      {/* Listing meta — always hardcoded */}
      {listing.created_at && (
        <View style={styles.section}>
          <Text style={styles.meta}>
            Listed {formatDate(listing.created_at)}
            {listing.listing_id ? ` \u00B7 MLS# ${listing.listing_id}` : ''}
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
  readMore: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    marginTop: 4,
  },
  meta: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  link: {
    color: COLORS.accent,
    textDecorationLine: 'underline',
  },
});
