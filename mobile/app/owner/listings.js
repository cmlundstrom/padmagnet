import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

// Owner/landlord listing management (paid tier)
export default function OwnerListingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Listings</Text>
      <Text style={styles.subtitle}>Create and manage your rental listings</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
