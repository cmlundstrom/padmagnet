import { useState, useEffect } from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { supabase } from '../../lib/supabase';
import { useUnreadCount } from '../../hooks/useUnreadCount';

export default function OwnerTabLayout() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  const unreadCount = useUnreadCount(userId);

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="listings">
        <NativeTabs.Trigger.Icon md="home" />
        <NativeTabs.Trigger.Label>Listings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon md="explore" />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
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
