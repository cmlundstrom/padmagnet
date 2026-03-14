import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { COLORS } from '../../constants/colors';
import { TAB_SCREEN_OPTIONS, TAB_ICON_SIZE } from '../../constants/screenStyles';

export default function TenantTabLayout() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  const unreadCount = useUnreadCount(userId);

  const tabBarStyle = {
    ...TAB_SCREEN_OPTIONS.tabBarStyle,
    paddingBottom: 0,
    marginBottom: -21,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }} edges={['bottom']}>
    <Tabs screenOptions={{ ...TAB_SCREEN_OPTIONS, tabBarStyle }}>
      <Tabs.Screen
        name="swipe"
        options={{
          title: 'Swipe',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="th-large" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.white} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="heart" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.white} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="envelope" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.white} />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
          tabBarBadgeStyle: unreadCount > 0 ? {
            backgroundColor: COLORS.danger,
            fontSize: 11,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            lineHeight: 18,
            borderRadius: 9,
          } : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="user" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.white} />
          ),
        }}
      />
    </Tabs>
    </SafeAreaView>
  );
}
