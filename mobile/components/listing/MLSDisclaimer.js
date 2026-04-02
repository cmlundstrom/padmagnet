import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import {
  MLS_COPYRIGHT, MLS_DISCLAIMER, BROKER_ATTRIBUTION,
  OWNER_COPYRIGHT, OWNER_DISCLAIMER,
} from '../../constants/mls';
import { apiFetch } from '../../lib/api';
import { EqualHousingBadge } from '../ui';

let cachedOwnerFooter = null;

export default function MLSDisclaimer({ listing }) {
  const year = new Date().getFullYear();
  const isOwner = listing?.source === 'owner';
  const officeName = listing?.listing_office_name;
  const [ownerFooter, setOwnerFooter] = useState(cachedOwnerFooter);

  useEffect(() => {
    if (!isOwner || cachedOwnerFooter) return;
    apiFetch('/api/config/public?keys=owner_listing_footer')
      .then(data => {
        if (data?.owner_listing_footer) {
          cachedOwnerFooter = data.owner_listing_footer;
          setOwnerFooter(data.owner_listing_footer);
        }
      })
      .catch(() => {});
  }, [isOwner]);

  if (isOwner) {
    const disclaimerText = ownerFooter || OWNER_DISCLAIMER;
    return (
      <View style={styles.container}>
        <Text style={styles.copyright}>
          {OWNER_COPYRIGHT.replace('{year}', year)}
        </Text>
        <Text style={styles.disclaimer}>{disclaimerText}</Text>
        <EqualHousingBadge style={{ marginTop: 8, justifyContent: 'flex-start' }} />
      </View>
    );
  }

  // MLS listing — full IDX compliance footer (not editable)
  return (
    <View style={styles.container}>
      {officeName && (
        <Text style={styles.broker}>
          {BROKER_ATTRIBUTION.replace('{officeName}', officeName)}
        </Text>
      )}
      {listing?.listing_agent_name && (
        <Text style={styles.agent}>
          Agent: {listing.listing_agent_name}
        </Text>
      )}
      <Text style={styles.copyright}>
        {MLS_COPYRIGHT.replace('{year}', year)}
      </Text>
      <Text style={styles.disclaimer}>{MLS_DISCLAIMER}</Text>
      <EqualHousingBadge style={{ marginTop: 8, justifyContent: 'flex-start' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: LAYOUT.padding.md,
    marginTop: LAYOUT.padding.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  broker: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginBottom: 4,
  },
  agent: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginBottom: 4,
  },
  copyright: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    marginBottom: 4,
  },
  disclaimer: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    lineHeight: 14,
  },
});
