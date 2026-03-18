import { useState, useCallback } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { signOut } from '../../lib/auth';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import ProfileCard from '../../components/screens/ProfileCard';
import { SCREEN, MENU, SIGN_OUT } from '../../constants/screenStyles';

export default function OwnerProfileScreen() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState({});

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

  // Fetch on focus + poll every 3s while focused (catches email change from browser)
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

  return (
    <SafeAreaView style={SCREEN.container} edges={['top']}>
      <Text style={SCREEN.pageTitle}>Profile</Text>

      <ProfileCard
        role={role}
        displayName={profile.display_name}
        email={profile.email}
        phone={profile.phone}
      />

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/subscription')}>
        <Text style={MENU.text}>Subscription & Billing</Text>
      </TouchableOpacity>

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/notifications')}>
        <Text style={MENU.text}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={SIGN_OUT.button} onPress={handleSignOut}>
        <Text style={SIGN_OUT.text}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
