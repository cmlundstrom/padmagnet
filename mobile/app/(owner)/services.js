import { useState, useCallback } from 'react';
import { FlatList, Text, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui';
import ProductCard from '../../components/ProductCard';
import useProducts from '../../hooks/useProducts';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

export default function ServicesScreen() {
  const { products, loading, refresh } = useProducts('owner');
  const alert = useAlert();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    // Small delay so spinner is visible
    setTimeout(() => setRefreshing(false), 600);
  }, [refresh]);

  const handlePurchase = (product) => {
    alert('Coming Soon', 'Stripe checkout is not yet configured. This feature will be available once payment processing is set up.');
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={SCREEN.centered} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <Text style={styles.header}>Services</Text>
      <Text style={styles.subtitle}>Products and add-ons for your listings</Text>

      {products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No products available"
          subtitle="Check back soon for listing packages and add-ons."
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onPurchase={handlePurchase} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.sm,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.body.regular,
    color: COLORS.textSecondary,
    paddingHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.sm,
  },
  listContent: {
    padding: LAYOUT.padding.md,
  },
});
