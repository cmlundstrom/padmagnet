import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const DEFAULT_STATS = {
  title: 'South Florida Market',
  items: [
    { label: 'Renters per vacancy', value: '19', icon: 'people' },
    { label: 'Avg. days to lease', value: '33', icon: 'time' },
    { label: 'Occupancy rate', value: '96.4%', icon: 'trending-up' },
  ],
  source: 'RentCafe / RealPage, 2025',
};

export default function MarketStats() {
  const [stats, setStats] = useState(DEFAULT_STATS);

  useEffect(() => {
    // Try to fetch admin-editable stats from site_config
    apiFetch('/api/config?key=market_stats')
      .then(data => {
        if (data?.value) setStats({ ...DEFAULT_STATS, ...data.value });
      })
      .catch(() => {}); // Fall back to defaults
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{stats.title}</Text>
      {stats.items.map((item, i) => (
        <View key={i} style={styles.statRow}>
          <Ionicons name={item.icon} size={LAYOUT.iconSize.lg} color={COLORS.accent} />
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
      <Text style={styles.source}>{stats.source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: LAYOUT.padding.md,
  },
  title: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.padding.sm,
    marginBottom: LAYOUT.padding.sm,
  },
  statValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    minWidth: 48,
  },
  statLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  source: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    marginTop: LAYOUT.padding.sm,
    fontStyle: 'italic',
  },
});
