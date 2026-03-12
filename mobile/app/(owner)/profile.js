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
  const [phone, setPhone] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setPhone(data?.phone || null));
    }, [user])
  );

  async function handleSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  return (
    <SafeAreaView style={SCREEN.container} edges={['top']}>
      <Text style={SCREEN.pageTitle}>Profile</Text>

      <ProfileCard user={user} role={role} phone={phone} />

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/edit-profile')}>
        <Text style={MENU.text}>Edit Profile</Text>
        <Text style={MENU.hint}>Update your name, email, or phone number</Text>
      </TouchableOpacity>

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/notifications')}>
        <Text style={MENU.text}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/verification')}>
        <Text style={MENU.text}>Verification Status</Text>
      </TouchableOpacity>

      <TouchableOpacity style={SIGN_OUT.button} onPress={handleSignOut}>
        <Text style={SIGN_OUT.text}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
