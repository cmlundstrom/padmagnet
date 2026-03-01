import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

// Create new direct owner listing ($9-$19/month via Stripe)
export default function CreateListingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create Listing</Text>
      <Text style={styles.subtitle}>List your rental property — $9-$19/month</Text>
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
