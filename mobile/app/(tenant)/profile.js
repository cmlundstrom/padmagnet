import { Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signOut } from '../../lib/auth';
import { useAuth } from '../../hooks/useAuth';
import ProfileCard from '../../components/screens/ProfileCard';
import { SCREEN, MENU, SIGN_OUT } from '../../constants/screenStyles';

export default function TenantProfileScreen() {
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace('/welcome');
  }

  return (
    <SafeAreaView style={SCREEN.container} edges={['top']}>
      <Text style={SCREEN.pageTitle}>Profile</Text>

      <ProfileCard user={user} fallbackName="Tenant" />

      <TouchableOpacity style={MENU.item} onPress={() => router.push('/settings/preferences')}>
        <Text style={MENU.text}>Preferences</Text>
        <Text style={MENU.hint}>Budget, location, pets, features</Text>
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
