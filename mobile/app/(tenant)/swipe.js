import { useCallback, useContext, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CardStack from '../../components/cards/CardStack';
import MapView from '../../components/map/MapView';
import { ListView } from '../../components/listing';
import { GlossyHeart } from '../../components/ui';
import LocationSoftAsk from '../../components/LocationSoftAsk';
import { PadPointsBar, SmartPromptCard, SMART_PROMPTS, LevelUpCelebration } from '../../components/padpoints';
import { AskPadOrb, AskPadChat } from '../../components/askpad';
import { TierUpgradeSheet } from '../../components/tiers';
import useRenterTier from '../../hooks/useRenterTier';
import useLocation from '../../hooks/useLocation';
import useListings from '../../hooks/useListings';
import useSwipe from '../../hooks/useSwipe';
import usePreferences from '../../hooks/usePreferences';
import usePadPoints, { PADPOINTS } from '../../hooks/usePadPoints';
import { useAlert } from '../../providers/AlertProvider';
import { AuthContext } from '../../providers/AuthProvider';
import { apiFetch } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { hasAskedLocation, setLocationAsked } from '../../lib/storage';
import { calculatePadScore } from '../../lib/padscore';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/fonts';
import { LAYOUT } from '../../constants/layout';
import { MLS_COPYRIGHT } from '../../constants/mls';

const VIEW_MODES = ['cards', 'map', 'list'];
const VIEW_ICONS = { cards: '▣', map: '◎', list: '☰' };

export default function SwipeScreen() {
  const router = useRouter();
  const { refresh: refreshParam } = useLocalSearchParams();
  const { user } = useContext(AuthContext);
  const [firstName, setFirstName] = useState('');

  // Load display name from profiles table (not stale auth session)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setFirstName(data.display_name.split(' ')[0]);
      });
  }, [user]);
  const [viewMode, setViewMode] = useState('cards');
  const [swipeCount, setSwipeCount] = useState(0);
  const [activePrompt, setActivePrompt] = useState(null);
  const [answeredPrompts, setAnsweredPrompts] = useState(new Set());
  const padPoints = usePadPoints();
  const renterTier = useRenterTier();
  const [showAskPad, setShowAskPad] = useState(false);
  const [showTierUpgrade, setShowTierUpgrade] = useState(false);

  // ── Location soft-ask ──────────────────────────────────────
  const [showLocationAsk, setShowLocationAsk] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const { location: deviceLocation, requestPermission, checkExistingPermission } = useLocation();
  const { listings, loading, error, hasMore, loadMore, refresh, removeFromDeck, prependToList } = useListings({
    deviceLat: deviceLocation?.latitude || null,
    deviceLng: deviceLocation?.longitude || null,
    locationReady,
  });

  useEffect(() => {
    (async () => {
      // If permission already granted from a prior session, fetch location then unlock listings
      const alreadyGranted = await checkExistingPermission();
      if (alreadyGranted) {
        setLocationReady(true);
        return;
      }

      // If we've already shown the soft-ask before, don't show again — just proceed without GPS
      const asked = await hasAskedLocation();
      if (asked) {
        setLocationReady(true);
        return;
      }

      // First time on swipe screen with no location permission — show soft-ask
      setShowLocationAsk(true);
    })();
  }, []);

  const handleLocationEnable = useCallback(async () => {
    setShowLocationAsk(false);
    await setLocationAsked();
    await requestPermission();
    setLocationReady(true);
  }, [requestPermission]);

  const handleLocationSkip = useCallback(async () => {
    setShowLocationAsk(false);
    await setLocationAsked();
    setLocationReady(true);
  }, []);

  // Check streak on mount
  useEffect(() => { padPoints.checkStreak(); }, []);

  // Auto-refresh listings when navigated here with ?refresh=true (e.g. after preferences change)
  useEffect(() => {
    if (refreshParam === 'true') {
      refresh();
    }
  }, [refreshParam, refresh]);
  const { recordSwipe } = useSwipe();
  const { preferences } = usePreferences();
  const alert = useAlert();

  const handleRefresh = useCallback(() => {
    alert(
      'Refresh Feed?',
      'Refreshing now will refresh your feed, newest to oldest. Your saved properties remain "Saved".',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: () => {
            refresh();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [alert, refresh]);

  // Attach PadScore to each listing
  const scoredListings = listings.map(listing => {
    if (!listing.padScore) {
      listing.padScore = calculatePadScore(preferences, listing);
    }
    return listing;
  });

  const handleSwipe = useCallback(async (listing, direction) => {
    const score = listing.padScore?.score ?? 50;

    // Haptic feedback — varies by action and match quality
    if (direction === 'right' && score >= 80) {
      // High match save — strong, satisfying double-tap
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
    } else if (direction === 'right') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    removeFromDeck(listing.id);

    const saved = await recordSwipe(listing.id, direction, score);
    if (!saved) {
      prependToList(listing);
    }

    // Award PadPoints
    const newCount = swipeCount + 1;
    setSwipeCount(newCount);

    if (direction === 'right') {
      const points = score >= 80 ? PADPOINTS.rightSwipeHighMatch : PADPOINTS.rightSwipe;
      await padPoints.earnPoints(points, score >= 80 ? 'High match save' : 'Saved listing');
    } else {
      await padPoints.earnPoints(PADPOINTS.leftSwipe, 'Passed');
    }

    // Check if it's time for a Smart Prompt Card
    const nextPrompt = SMART_PROMPTS.find(p => p.afterSwipe === newCount && !answeredPrompts.has(p.key));
    if (nextPrompt) {
      setActivePrompt(nextPrompt);
    }
  }, [removeFromDeck, recordSwipe, prependToList, swipeCount, padPoints, answeredPrompts]);

  const handleTapCard = useCallback((listing) => {
    router.push(`/listing/${listing.id}`);
  }, [router]);

  return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.resetBtn} onPress={handleRefresh}>
              <FontAwesome name="refresh" size={16} color={COLORS.textSecondary} />
            </Pressable>
            <Text style={styles.logo}>
              <Text style={{ color: COLORS.white }}>Pad</Text>
              <Text style={{ color: COLORS.deepOrange }}>Magnet</Text>
            </Text>
          </View>
          <View style={styles.headerRight}>
          <View style={styles.viewToggle}>
            {VIEW_MODES.map(mode => (
              <Pressable
                key={mode}
                style={[
                  styles.toggleButton,
                  viewMode === mode && styles.toggleButtonActive,
                ]}
                onPress={() => setViewMode(mode)}
              >
                <Text
                  style={[
                    styles.toggleIcon,
                    viewMode === mode && styles.toggleIconActive,
                  ]}
                >
                  {VIEW_ICONS[mode]}
                </Text>
              </Pressable>
            ))}
          </View>
          </View>
        </View>

        {/* PadPoints bar + Ask Pad orb */}
        {(viewMode === 'cards' || viewMode === 'list') && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <PadPointsBar
                padpoints={padPoints.padpoints}
                level={padPoints.level}
                progress={padPoints.progress}
                streakDays={padPoints.streakDays}
                lastEarned={padPoints.lastEarned}
                renterTier={renterTier.tier}
                onUpgrade={() => setShowTierUpgrade(true)}
              />
            </View>
            <View style={{ paddingRight: LAYOUT.padding.md }}>
              <AskPadOrb
                onPress={() => setShowAskPad(true)}
                remainingQueries={renterTier.remainingQueries}
                dailyLimit={renterTier.dailyLimit}
              />
            </View>
          </View>
        )}

        {/* Smart Prompt Card (appears between swipes at scheduled intervals) */}
        {activePrompt && viewMode === 'cards' && (
          <View style={styles.promptOverlay}>
            <SmartPromptCard
              prompt={activePrompt}
              onAskPad={() => { setActivePrompt(null); setShowAskPad(true); }}
              onAnswer={async (key, value) => {
                setAnsweredPrompts(prev => new Set([...prev, key]));
                setActivePrompt(null);

                // Award PadPoints for answering
                padPoints.earnPoints(activePrompt.padpoints, `Answered: ${activePrompt.title}`);

                // Save preference to server
                try {
                  const prefUpdate = {};
                  prefUpdate[activePrompt.prefKey] = value;
                  await supabase
                    .from('tenant_preferences')
                    .upsert({ user_id: user?.id, ...prefUpdate }, { onConflict: 'user_id' });
                } catch { /* silent — preference saved locally via hook */ }
              }}
              onSkip={() => {
                setAnsweredPrompts(prev => new Set([...prev, activePrompt.key]));
                setActivePrompt(null);
              }}
            />
          </View>
        )}

        {/* Card area */}
        <View style={[styles.cardArea, viewMode === 'cards' && { marginTop: activePrompt ? 0 : 35 }]}>
          {viewMode === 'cards' && (
            <CardStack
              listings={scoredListings}
              loading={loading}
              error={error}
              onSwipe={handleSwipe}
              onTapCard={handleTapCard}
              onPreferences={() => router.push('/settings/preferences')}
              onRefresh={refresh}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          )}
          {viewMode === 'map' && (
            <MapView
              listings={scoredListings}
              loading={loading}
            />
          )}
          {viewMode === 'list' && (
            <ListView
              listings={scoredListings}
              loading={loading}
              error={error}
              onRefresh={refresh}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          )}
        </View>

        {/* Action buttons (cards mode only) */}
        {viewMode === 'cards' && scoredListings.length > 0 && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => {
                if (scoredListings.length > 0) {
                  handleSwipe(scoredListings[0], 'left');
                }
              }}
            >
              <Text style={{ fontSize: FONT_SIZES.lg, textAlign: 'center' }}>🗑</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.infoButton]}
              onPress={() => {
                if (scoredListings.length > 0) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleTapCard(scoredListings[0]);
                }
              }}
            >
              <FontAwesome name="info" size={22} color={COLORS.white} />
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.saveButton]}
              onPress={() => {
                if (scoredListings.length > 0) {
                  handleSwipe(scoredListings[0], 'right');
                }
              }}
            >
              <GlossyHeart size={33} />
            </Pressable>
          </View>
        )}

        {/* MLS compliance footer */}
        <Text style={styles.mlsFooter}>
          {MLS_COPYRIGHT.replace('{year}', new Date().getFullYear())}
        </Text>

        {/* Level Up Celebration */}
        <LevelUpCelebration
          visible={padPoints.lastEarned?.leveledUp === true}
          level={padPoints.lastEarned?.newLevel}
          onDismiss={() => {}}
        />

        {/* Ask Pad Chat Modal */}
        <AskPadChat
          visible={showAskPad}
          onClose={() => setShowAskPad(false)}
          onUpgrade={() => { setShowAskPad(false); setShowTierUpgrade(true); }}
          onPreferences={() => router.push('/settings/preferences')}
          onNotifications={() => router.push('/settings/notifications')}
          onViewListing={(id) => router.push(`/listing/${id}`)}
          onQuerySent={() => renterTier.refresh()}
          deviceLat={deviceLocation?.latitude || null}
          deviceLng={deviceLocation?.longitude || null}
        />

        {/* Tier Upgrade Sheet (opened from streak tooltip) */}
        <TierUpgradeSheet
          visible={showTierUpgrade}
          onClose={() => setShowTierUpgrade(false)}
          currentTier={renterTier.tier}
          padpoints={padPoints.padpoints}
          onBuyExplorer={async () => {
            try {
              const result = await apiFetch('/api/renter-tier/checkout', {
                method: 'POST',
                body: JSON.stringify({ tier: 'explorer' }),
              });
              if (result.checkout_url) {
                const { Linking } = require('react-native');
                Linking.openURL(result.checkout_url);
              }
              setShowTierUpgrade(false);
            } catch (err) {
              alert('Upgrade Error', err.message);
            }
          }}
          onBuyMaster={async () => {
            try {
              const result = await apiFetch('/api/renter-tier/checkout', {
                method: 'POST',
                body: JSON.stringify({ tier: 'master' }),
              });
              if (result.checkout_url) {
                const { Linking } = require('react-native');
                Linking.openURL(result.checkout_url);
              }
              setShowTierUpgrade(false);
            } catch (err) {
              alert('Upgrade Error', err.message);
            }
          }}
          onRedeemExplorer={async () => {
            try {
              await apiFetch('/api/renter-tier/redeem', { method: 'POST' });
              renterTier.refresh();
              padPoints.checkStreak();
              setShowTierUpgrade(false);
            } catch (err) {
              alert('Redeem Error', err.message);
            }
          }}
        />

        {/* Location soft-ask overlay — shown once on first visit */}
        {showLocationAsk && (
          <LocationSoftAsk
            onEnable={handleLocationEnable}
            onSkip={handleLocationSkip}
          />
        )}
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.padding.md,
    paddingVertical: LAYOUT.padding.sm,
  },
  logo: {
    fontFamily: FONTS.heading.bold,
    fontSize: FONT_SIZES.xl,
  },
  introText: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: LAYOUT.padding.lg,
    paddingBottom: LAYOUT.padding.xs,
    marginTop: 5,
  },
  introBold: {
    fontFamily: FONTS.body.bold,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.sm,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: LAYOUT.radius.sm - 2,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.card,
  },
  toggleIcon: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  toggleIconActive: {
    color: COLORS.accent,
  },
  cardArea: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: LAYOUT.padding.md,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.radius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: COLORS.surface,
  },
  skipButton: {
    borderColor: COLORS.danger,
  },
  infoButton: {
    width: 52,
    height: 52,
    borderRadius: LAYOUT.radius['2xl'],
    borderColor: COLORS.white,
  },
  infoText: {
    fontSize: FONT_SIZES.xxs,
    fontFamily: FONTS.heading.bold,
    color: COLORS.accent,
    textAlign: 'center',
    lineHeight: 13,
  },
  saveButton: {
    borderColor: COLORS.success,
  },
  actionText: {
    fontSize: 22,
    fontFamily: FONTS.heading.bold,
  },
  mlsFooter: {
    fontFamily: FONTS.body.regular,
    fontSize: FONT_SIZES.xxs,
    color: COLORS.slate,
    textAlign: 'center',
    paddingBottom: LAYOUT.padding.sm,
    paddingHorizontal: LAYOUT.padding.md,
  },
  promptOverlay: {
    paddingVertical: LAYOUT.padding.md,
    alignItems: 'center',
  },
});
