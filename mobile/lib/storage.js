import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PREFERENCES: 'padmagnet_preferences',
  ONBOARDED: 'padmagnet_onboarded',
  USER_ROLE: 'padmagnet_user_role',
};

export async function getPreferences() {
  const raw = await AsyncStorage.getItem(KEYS.PREFERENCES);
  return raw ? JSON.parse(raw) : null;
}

export async function savePreferences(prefs) {
  await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
}

export async function hasOnboarded() {
  return (await AsyncStorage.getItem(KEYS.ONBOARDED)) === 'true';
}

export async function setOnboarded() {
  await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
}

export async function saveUserRole(role) {
  await AsyncStorage.setItem(KEYS.USER_ROLE, role);
}

export async function getUserRole() {
  return await AsyncStorage.getItem(KEYS.USER_ROLE);
}

export async function clearUserRole() {
  await AsyncStorage.removeItem(KEYS.USER_ROLE);
}
