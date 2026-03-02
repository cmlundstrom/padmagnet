import { Stack } from 'expo-router';
import { COLORS } from '../../constants/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="email" />
      <Stack.Screen name="password" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
