import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

// Main swipe screen — card stack goes here
// Will use react-native-gesture-handler + react-native-reanimated for native-thread gestures
export default function SwipeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>PadMagnet</Text>
      <View style={styles.cardArea}>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Swipe cards will appear here</Text>
          <Text style={styles.placeholderSubtext}>Awaiting IDX listing data</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={[styles.actionButton, styles.skipButton]}>
          <Text style={styles.actionText}>✕</Text>
        </View>
        <View style={[styles.actionButton, styles.saveButton]}>
          <Text style={styles.actionText}>♡</Text>
        </View>
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
    textAlign: 'center',
    paddingVertical: 12,
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  placeholderCard: {
    width: '100%',
    height: '80%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  skipButton: {
    borderColor: COLORS.danger,
  },
  saveButton: {
    borderColor: COLORS.success,
  },
  actionText: {
    fontSize: 24,
    color: COLORS.white,
  },
});
