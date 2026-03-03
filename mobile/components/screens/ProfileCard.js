import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { getUserRole } from '../../lib/storage';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const ROLE_LABELS = {
  owner: 'Property Owner',
  tenant: 'Tenant',
};

export default function ProfileCard({ user }) {
  const [roleLabel, setRoleLabel] = useState('');

  useEffect(() => {
    async function resolveRole() {
      const role = user?.user_metadata?.role || await getUserRole() || 'tenant';
      setRoleLabel(ROLE_LABELS[role] || role);
    }
    resolveRole();
  }, [user]);

  return (
    <View style={styles.card}>
      <Text style={styles.name}>
        {user?.user_metadata?.display_name || 'Name not set'}
      </Text>
      <Text style={styles.role}>{roleLabel}</Text>
      <Text style={styles.email}>{user?.email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.lg,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  name: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    marginBottom: 2,
  },
  role: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    marginBottom: 4,
  },
  email: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
