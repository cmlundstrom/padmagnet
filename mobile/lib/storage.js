import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PREFERENCES: 'padmagnet_preferences',
  ONBOARDED: 'padmagnet_onboarded',
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
