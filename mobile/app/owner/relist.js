import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Header, Button } from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://padmagnet.com';

export default function RelistScreen() {
  const { listing_id } = useLocalSearchParams();
  const router = useRouter();
  const alert = useAlert();
  const [loading, setLoading] = useState(false);

  const handleRenew = async () => {
    setLoading(true);
    try {
      // Try instant renewal with saved payment method
      const result = await apiFetch('/api/stripe/renew', {
        method: 'POST',
        body: JSON.stringify({ listing_id }),
      });

      if (result.success) {
        alert('Listing Renewed', 'Your listing is active for another 30 days.', [
          { text: 'OK', onPress: () => router.replace('/owner/listings') },
        ]);
        return;
      }
    } catch (err) {
      // No saved payment method — fall back to Stripe Checkout
      try {
        const checkout = await apiFetch('/api/stripe/checkout', {
          method: 'POST',
          body: JSON.stringify({ listing_id, product_ids: [] }),
        });

        if (checkout.checkout_url) {
          await WebBrowser.openBrowserAsync(checkout.checkout_url);
          router.replace('/owner/listings');
          return;
        }
      } catch (checkoutErr) {
        alert('Error', checkoutErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Re-list Property" showBack />
      <View style={styles.content}>
        <Text style={styles.title}>Renew Your Listing</Text>
        <Text style={styles.description}>
          Your listing has expired. Renew for another 30 days to make it visible to tenants again.
        </Text>
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>30-Day Listing</Text>
          <Text style={styles.priceValue}>$29.99</Text>
        </View>
        <Button
          title="Renew Now"
          onPress={handleRenew}
          loading={loading}
          style={styles.renewBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: LAYOUT.padding.md,
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.padding.md,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.accent,
    marginTop: 4,
  },
  renewBtn: {
    alignSelf: 'center',
    minWidth: 200,
  },
});
