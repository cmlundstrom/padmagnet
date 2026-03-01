import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

// Tenant preferences: budget range, beds/baths, pets, location radius, move-in date
export default function PreferencesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your Preferences</Text>
      <Text style={styles.subtitle}>Budget, beds, pets, location — powers your PadScore</Text>
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
