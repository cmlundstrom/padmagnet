import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { TAB_SCREEN_OPTIONS, TAB_ICON_SIZE } from '../../constants/screenStyles';

export default function OwnerTabLayout() {
  const tabBarStyle = {
    ...TAB_SCREEN_OPTIONS.tabBarStyle,
    paddingBottom: 4,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }} edges={['bottom']}>
    <Tabs screenOptions={{ ...TAB_SCREEN_OPTIONS, tabBarStyle }}>
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Listings',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="home" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.white} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ focused }) => (
            <FontAwesome name="cog" size={TAB_ICON_SIZE} color={focused ? COLORS.accent : COLORS.white} />
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
