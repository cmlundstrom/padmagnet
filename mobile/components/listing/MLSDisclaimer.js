import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { MLS_COPYRIGHT, MLS_DISCLAIMER, BROKER_ATTRIBUTION } from '../../constants/mls';

export default function MLSDisclaimer({ listing }) {
  const year = new Date().getFullYear();
  const officeName = listing?.listing_office_name;

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
    fontSize: 10,
    color: COLORS.slate,
    marginBottom: 4,
  },
  disclaimer: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.slate,
    lineHeight: 14,
  },
});
