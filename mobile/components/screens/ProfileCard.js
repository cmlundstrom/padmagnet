import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

/**
 * ProfileCard — read-only display of contact info.
 *
 * Editing affordances live in the Settings menu items below this card on
 * the profile screens (Edit Profile for name+phone; Change Email for email).
 * The previous "Edit" pill on this card was a duplicate entry point that
 * routed to the same Edit Profile screen — removed to eliminate confusion.
 */
export default function ProfileCard({ displayName, email, phone }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>Contact Info</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <Ionicons name="person-outline" size={15} color={COLORS.accent} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{displayName || 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <Ionicons name="mail-outline" size={15} color={COLORS.accent} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{email || 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <Ionicons name="call-outline" size={15} color={COLORS.accent} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{phone || 'Not set'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    // Elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginLeft: 44,
  },
});
