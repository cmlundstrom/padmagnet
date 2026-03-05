import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PREFERENCES: 'padmagnet_preferences',
  ONBOARDED: 'padmagnet_onboarded',
  ONBOARDING_STEP: 'padmagnet_onboarding_step',
  USER_ROLE: 'padmagnet_user_role',
  SEARCH_ZONES: '@padmagnet_search_zones',
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
  await AsyncStorage.removeItem(KEYS.ONBOARDING_STEP);
}

export async function getOnboardingStep() {
  const raw = await AsyncStorage.getItem(KEYS.ONBOARDING_STEP);
  return raw ? parseInt(raw, 10) : 0;
}

export async function saveOnboardingStep(step) {
  await AsyncStorage.setItem(KEYS.ONBOARDING_STEP, String(step));
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

export async function getSearchZones() {
  const raw = await AsyncStorage.getItem(KEYS.SEARCH_ZONES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveSearchZones(zones) {
  await AsyncStorage.setItem(KEYS.SEARCH_ZONES, JSON.stringify(zones));
}
