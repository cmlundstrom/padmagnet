import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/fonts';

function TabIcon({ label, focused }) {
  const icons = { Listings: '🏠', Messages: '✉', Services: '⚙', Profile: '●' };
  return (
    <Text style={{ fontSize: 20, color: focused ? COLORS.accent : COLORS.slate }}>
      {icons[label] || '○'}
    </Text>
  );
}

export default function OwnerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.slate,
        tabBarLabelStyle: {
          fontFamily: FONTS.body.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Listings',
          tabBarIcon: ({ focused }) => <TabIcon label="Listings" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => <TabIcon label="Messages" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ focused }) => <TabIcon label="Services" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
