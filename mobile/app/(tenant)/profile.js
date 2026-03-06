import { Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signOut } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import ProfileCard from '../../components/screens/ProfileCard';
import { COLORS } from '../../constants/colors';
import { SCREEN, MENU, SIGN_OUT } from '../../constants/screenStyles';

export default function TenantProfileScreen() {
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  function handleResetSwipes() {
    Alert.alert(
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
              Alert.alert('Done', `${result.deleted} swipe${result.deleted === 1 ? '' : 's'} reset. Your deck will refresh.`);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={SCREEN.container} edges={['top']}>
      <Text style={SCREEN.pageTitle}>Profile</Text>

      <ProfileCard user={user} />

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/preferences')}>
        <Text style={MENU.text}>PadScore™ Preferences</Text>
        <Text style={MENU.hint}>Budget, location, property type, pets, features</Text>
      </TouchableOpacity>

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/notifications')}>
        <Text style={MENU.text}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/verification')}>
        <Text style={MENU.text}>Verification Status</Text>
      </TouchableOpacity>

      <TouchableOpacity style={MENU.item} onPress={handleResetSwipes}>
        <Text style={[MENU.text, { color: COLORS.danger }]}>Reset Swipe History</Text>
        <Text style={MENU.hint}>Clear all saved and passed listings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={SIGN_OUT.button} onPress={handleSignOut}>
        <Text style={SIGN_OUT.text}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
