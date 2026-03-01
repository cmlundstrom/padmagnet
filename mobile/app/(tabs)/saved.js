import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

export default function SavedScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Saved Listings</Text>
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No saved listings yet</Text>
        <Text style={styles.emptySubtext}>Swipe right on listings you like</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
