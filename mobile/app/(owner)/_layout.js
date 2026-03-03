import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TAB_SCREEN_OPTIONS, TAB_ICON_SIZE } from '../../constants/screenStyles';

export default function OwnerTabLayout() {
  return (
    <Tabs screenOptions={TAB_SCREEN_OPTIONS}>
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Listings',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="home" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.slate} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="envelope" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.slate} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="cog" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.slate} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="user" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.slate} />
          ),
        }}
      />
    </Tabs>
  );
}
