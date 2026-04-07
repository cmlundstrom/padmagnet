import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadCount } from '../../hooks/useUnreadCount';

export default function TenantTabLayout() {
  const { user } = useAuth();
  const unreadCount = useUnreadCount(user?.id);

  return (
    <NativeTabs
      tintColor="#FFFFFF"
      barTintColor="#0B1D3A"
      inactiveTintColor="#B0BEC5"
    >
      <NativeTabs.Trigger name="swipe">
        <NativeTabs.Trigger.Icon md="dashboard" />
        <NativeTabs.Trigger.Label>Swipe</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon md="favorite" />
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Icon md="mail" />
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        {unreadCount > 0 && (
          <NativeTabs.Trigger.Badge>{unreadCount > 9 ? '9+' : String(unreadCount)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
