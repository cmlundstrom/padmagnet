import { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { EmptyState } from '../../components/ui';
import ProductCard from '../../components/ProductCard';
import useProducts from '../../hooks/useProducts';
import { apiFetch } from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { useAlert } from '../../providers/AlertProvider';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

export default function OwnerListingsTab() {
  const router = useRouter();
  const alert = useAlert();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { products } = useProducts('owner');
  const featuredProduct = products.find(p => p.app_path === '/my-listings');

  const handlePurchase = () => {
    alert('Coming Soon', 'Stripe checkout is not yet configured. This feature will be available once payment processing is set up.');
  };

  const fetchListings = useCallback(async () => {
    try {
      const data = await apiFetch('/api/owner/listings');
      setListings(data || []);
    } catch (err) {
      alert('Error', err.message);
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
    alert(
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
              alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={SCREEN.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Listings</Text>
        <Pressable onPress={() => router.push('/owner/create')}>
          <Text style={styles.addButton}>+ New</Text>
        </Pressable>
      </View>

      {listings.length === 0 ? (
        <View style={styles.emptyWrapper}>
          {featuredProduct && (
            <View style={styles.featuredWrap}>
              <Text style={styles.featuredLabel}>Get started with a listing package</Text>
              <ProductCard
                product={featuredProduct}
                onPurchase={handlePurchase}
                featured
              />
            </View>
          )}
          <EmptyState
            icon="🏠"
            title="No listings yet"
            subtitle="Create your first rental listing to start receiving inquiries."
            actionLabel="Create Listing"
            onAction={() => router.push('/owner/create')}
          />
        </View>
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
              onContinueDraft={() => router.push(`/owner/create?draft_id=${item.id}`)}
              onRelist={() => router.push(`/owner/relist?listing_id=${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'active': return COLORS.success;
    case 'draft': return COLORS.warning;
    case 'expired': return COLORS.danger;
    case 'leased': return COLORS.accent;
    default: return COLORS.slate;
  }
}

function getExpiresLabel(expiresAt) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Expired';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function OwnerListingRow({ listing, onEdit, onDeactivate, onContinueDraft, onRelist }) {
  const address = [listing.street_number, listing.street_name].filter(Boolean).join(' ');
  const cityLine = [listing.city, listing.state_or_province].filter(Boolean).join(', ');
  const firstPhoto = listing.photos?.[0]?.url;
  const status = listing.status || (listing.is_active ? 'active' : 'archived');
  const expiresLabel = listing.source === 'owner' ? getExpiresLabel(listing.expires_at) : null;

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
          <Text style={styles.listingPrice}>
            {listing.list_price ? `${formatCurrency(listing.list_price)}/mo` : 'Draft'}
          </Text>
          <Text style={styles.listingAddress} numberOfLines={1}>{address || 'No address'}</Text>
          <Text style={styles.listingCity} numberOfLines={1}>{cityLine}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '22' }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(status) }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
            {expiresLabel && (
              <Text style={styles.expiresLabel}>{expiresLabel}</Text>
            )}
          </View>
          {(listing.view_count > 0 || listing.inquiry_count > 0) && (
            <Text style={styles.statsText}>
              {listing.view_count || 0} views · {listing.inquiry_count || 0} inquiries
            </Text>
          )}
        </View>
      </Pressable>
      <View style={styles.listingActions}>
        {status === 'draft' ? (
          <Pressable style={styles.actionBtn} onPress={onContinueDraft}>
            <Text style={styles.actionBtnText}>Continue</Text>
          </Pressable>
        ) : status === 'expired' ? (
          <>
            <Pressable style={styles.actionBtn} onPress={onRelist}>
              <Text style={styles.actionBtnText}>Re-list</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={onDeactivate}>
              <Text style={[styles.actionBtnText, styles.dangerBtnText]}>Archive</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.actionBtn} onPress={onEdit}>
              <Text style={styles.actionBtnText}>Edit</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={onDeactivate}>
              <Text style={[styles.actionBtnText, styles.dangerBtnText]}>Archive</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
  headerTitle: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.text,
  },
  addButton: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
  },
  emptyWrapper: {
    flex: 1,
  },
  featuredWrap: {
    paddingHorizontal: LAYOUT.padding.md,
    paddingTop: LAYOUT.padding.md,
  },
  featuredLabel: {
    fontFamily: FONTS.heading.semiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
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
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: LAYOUT.radius.full,
  },
  statusBadgeText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 10,
  },
  expiresLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statsText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.slate,
    marginTop: 2,
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
