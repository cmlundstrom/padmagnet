import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import ManilaFolderStack from '../../components/owner/ManilaFolderStack';
import AuthBottomSheet from '../../components/auth/AuthBottomSheet';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { SCREEN } from '../../constants/screenStyles';

export default function OwnerHomeTab() {
  const router = useRouter();
  const { preview } = useLocalSearchParams();
  const { session, role } = useAuth();
  const isAnon = session?.user?.is_anonymous === true;
  const isAdminPreview = preview === 'true' && ['admin', 'super_admin'].includes(role);
  const [showAuth, setShowAuth] = useState(false);

  return (
    <SafeAreaView style={SCREEN.containerFlush} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
      </View>

      <View style={{ flex: 1 }}>
        {isAdminPreview && (
          <View style={styles.previewBanner}>
            <Text style={styles.previewBannerText}>Admin Preview Mode</Text>
          </View>
        )}
        <ManilaFolderStack
          isAnon={isAnon}
          onShowAuth={() => setShowAuth(true)}
          onNavigateCreate={() => router.push('/owner/create')}
          onNavigateExplore={() => router.push('/(owner)/explore')}
        />
      </View>

      <AuthBottomSheet
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        context="create_listing"
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
