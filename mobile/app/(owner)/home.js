import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../lib/api';
import ManilaFolderStack from '../../components/owner/ManilaFolderStack';
import OwnerHeader from '../../components/owner/OwnerHeader';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

export default function OwnerHomeTab() {
  const router = useRouter();
  const { preview, view } = useLocalSearchParams();
  const { session, role, isAnon } = useAuth();
  const isAdminPreview = preview === 'true' && ['admin', 'super_admin'].includes(role);
  const [showAuth, setShowAuth] = useState(false);
  const [viewMode, setViewMode] = useState(view || 'grid');
  const [refreshKey, setRefreshKey] = useState(0);
  const [ownerHasListings, setOwnerHasListings] = useState(false);

  // Check if owner already has any listings (any status)
  useEffect(() => {
    if (isAnon || !session?.user?.id) return;
    apiFetch('/api/owner/listings')
      .then(data => setOwnerHasListings((data || []).length > 0))
      .catch(() => {});
  }, [isAnon, session?.user?.id]);

  // Post-auth routing is handled entirely by AuthBottomSheet.getReturnPath()
  // via the auth_return_to AsyncStorage key read by auth-callback.js. The
  // previous auto-nav effect here duplicated that logic and fired on every
  // home.js mount, hijacking auths initiated from Profile/Messages/etc.
  // Removed 2026-04-21. See context='create_listing' branch in
  // AuthBottomSheet.getReturnPath for the post-auth destination.

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <OwnerHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={() => setRefreshKey(k => k + 1)}
        viewModes={['grid', 'map']}
      />

      <View style={{ flex: 1 }}>
        {isAdminPreview && (
          <View style={styles.previewBanner}>
            <Text style={styles.previewBannerText}>Admin Preview Mode</Text>
          </View>
        )}
        <ManilaFolderStack
          refreshKey={refreshKey}
          viewMode={viewMode}
          isAnon={isAnon}
          ownerHasListings={ownerHasListings}
          onShowAuth={() => setShowAuth(true)}
          onNavigateCreate={() => router.push('/owner/create')}
          onNavigateListings={() => router.push('/(owner)/listings')}
          onNavigateExplore={() => router.push('/(owner)/explore')}
        />
      </View>

      <AuthBottomSheet
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        context="create_listing"
        ownerHasListings={ownerHasListings}
      />
    </SafeAreaView>
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
  previewBanner: {
    backgroundColor: COLORS.warning + '33',
    borderRadius: 8,
    padding: LAYOUT.padding.sm,
    marginHorizontal: LAYOUT.padding.md,
    marginBottom: LAYOUT.padding.md,
    alignItems: 'center',
  },
  previewBannerText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
