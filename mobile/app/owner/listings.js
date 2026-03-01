import { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator, RefreshControl, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Header, Button, EmptyState } from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';

export default function OwnerListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const data = await apiFetch('/api/owner/listings');
      setListings(data || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings();
  }, [fetchListings]);

  const handleDeactivate = (listing) => {
    Alert.alert(
      'Deactivate Listing',
      `Are you sure you want to deactivate "${[listing.street_number, listing.street_name].filter(Boolean).join(' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/owner/listings/${listing.id}`, { method: 'DELETE' });
              setListings(prev => prev.filter(l => l.id !== listing.id));
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="My Listings"
        showBack
        rightAction={
          <Pressable onPress={() => router.push('/owner/create')}>
            <Text style={styles.addButton}>+ New</Text>
          </Pressable>
        }
      />

      {listings.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="No listings yet"
          subtitle="Create your first rental listing to start receiving inquiries."
          actionLabel="Create Listing"
          onAction={() => router.push('/owner/create')}
        />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
          renderItem={({ item }) => (
            <OwnerListingRow
              listing={item}
              onEdit={() => router.push(`/listing/${item.id}`)}
              onDeactivate={() => handleDeactivate(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function OwnerListingRow({ listing, onEdit, onDeactivate }) {
  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province].filter(Boolean).join(', ');
  const firstPhoto = listing.photos?.[0]?.url;

  return (
    <View style={styles.listingRow}>
      <Pressable style={styles.listingContent} onPress={onEdit}>
        <View style={styles.listingPhoto}>
          {firstPhoto ? (
            <Image source={{ uri: firstPhoto }} style={styles.listingImage} contentFit="cover" />
          ) : (
            <View style={[styles.listingImage, styles.noPhoto]}>
              <Text style={styles.noPhotoText}>🏠</Text>
            </View>
          )}
        </View>
        <View style={styles.listingInfo}>
          <Text style={styles.listingPrice}>{formatCurrency(listing.list_price)}/mo</Text>
          <Text style={styles.listingAddress} numberOfLines={1}>{address}</Text>
          <Text style={styles.listingCity} numberOfLines={1}>{cityLine}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: listing.is_active ? COLORS.success : COLORS.slate }]} />
            <Text style={styles.statusText}>{listing.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.listingActions}>
        <Pressable style={styles.actionBtn} onPress={onEdit}>
          <Text style={styles.actionBtnText}>View</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={onDeactivate}>
          <Text style={[styles.actionBtnText, styles.dangerBtnText]}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  listContent: {
    padding: LAYOUT.padding.md,
  },
  listingRow: {
    backgroundColor: COLORS.card,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  listingContent: {
    flexDirection: 'row',
  },
  listingPhoto: {
    width: 90,
    height: 90,
  },
  listingImage: {
    flex: 1,
  },
  noPhoto: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    fontSize: 28,
  },
  listingInfo: {
    flex: 1,
    padding: LAYOUT.padding.sm,
    justifyContent: 'center',
  },
  listingPrice: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  listingAddress: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listingCity: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  listingActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontFamily: FONTS.body.medium,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  dangerBtn: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  dangerBtnText: {
    color: COLORS.danger,
  },
});
