import { useState, useCallback } from 'react';
import { Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { signOut } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import usePadPoints from '../../hooks/usePadPoints';
import { useAlert } from '../../providers/AlertProvider';
import { supabase } from '../../lib/supabase';
import ProfileCard from '../../components/screens/ProfileCard';
import { PadScoreDashboard } from '../../components/padpoints';
import { COLORS } from '../../constants/colors';
import { SCREEN, MENU, SIGN_OUT } from '../../constants/screenStyles';

export default function TenantProfileScreen() {
  const { user, role } = useAuth();
  const alert = useAlert();
  const [profile, setProfile] = useState({});
  const padPoints = usePadPoints();

  const fetchProfile = useCallback(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, email, phone')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      const interval = setInterval(fetchProfile, 3000);
      return () => clearInterval(interval);
    }, [fetchProfile])
  );

  async function handleSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  function handleResetSwipes() {
    alert(
      'Reset Swipe History',
      'This will reset all your liked and passed listings. They\'ll reappear in your swipe deck.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiFetch('/api/swipes/reset', { method: 'DELETE' });
              alert('Done', `${result.deleted} swipe${result.deleted === 1 ? '' : 's'} reset. Your deck will refresh.`);
            } catch (err) {
              alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={SCREEN.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={SCREEN.pageTitle}>You</Text>

        {/* PadScore Dashboard — the hero of the profile */}
        <PadScoreDashboard
          padpoints={padPoints.padpoints}
          level={padPoints.level}
          progress={padPoints.progress}
          nextLevel={padPoints.nextLevel}
          streakDays={padPoints.streakDays}
          badges={padPoints.badges}
        />

        {/* Profile card (name/email/phone) */}
        <ProfileCard
          role={role}
          displayName={profile.display_name}
          email={profile.email}
          phone={profile.phone}
        />

        <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/quick-prefs')}>
          <Text style={MENU.text}>Tune Your PadScore</Text>
          <Text style={MENU.hint}>Budget, location, property type, pets, features</Text>
        </TouchableOpacity>

        <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/notifications')}>
          <Text style={MENU.text}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={MENU.item} onPress={handleResetSwipes}>
          <Text style={[MENU.text, { color: COLORS.danger }]}>Reset Swipe History</Text>
          <Text style={MENU.hint}>Clear all saved and passed listings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={SIGN_OUT.button} onPress={handleSignOut}>
          <Text style={SIGN_OUT.text}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[MENU.item, { marginTop: 24 }]} onPress={() => router.push('/settings/delete-account')}>
          <Text style={[MENU.text, { color: COLORS.danger, fontSize: 13 }]}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
