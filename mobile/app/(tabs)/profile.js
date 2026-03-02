import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signOut } from '../../lib/auth';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function ProfileScreen() {
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{user?.user_metadata?.display_name || 'Tenant'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/preferences')}>
        <Text style={styles.menuText}>Preferences</Text>
        <Text style={styles.menuHint}>Budget, location, pets, features</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/notifications')}>
        <Text style={styles.menuText}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/verification')}>
        <Text style={styles.menuText}>Verification Status</Text>
      </TouchableOpacity>

      {/* Owner Tools */}
      <Text style={styles.sectionLabel}>Owner Tools</Text>

      <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/owner/listings')}>
        <Text style={styles.menuText}>My Listings</Text>
        <Text style={styles.menuHint}>Create and manage your rental listings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuItem, styles.createItem]} onPress={() => router.push('/owner/create')}>
        <Text style={styles.createText}>+ Create Listing</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: LAYOUT.padding.md,
  },
  header: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    marginBottom: LAYOUT.padding.md,
  },
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
    marginBottom: 4,
  },
  email: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sectionLabel: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  menuHint: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 2,
  },
  createItem: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '11',
  },
  createText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.accent,
  },
  signOutButton: {
    marginTop: 'auto',
    padding: LAYOUT.padding.md,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.md,
    color: COLORS.danger,
  },
});
