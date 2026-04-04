import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PREFERENCES: 'padmagnet_preferences',
  ONBOARDED: 'padmagnet_onboarded',
  ONBOARDING_STEP: 'padmagnet_onboarding_step',
  USER_ROLE: 'padmagnet_user_role',
  ROLE_SELECTED: 'padmagnet_role_selected', // true after first role selection (skip welcome on re-open)
  SEARCH_ZONES: '@padmagnet_search_zones',
  LOCATION_ASKED: 'padmagnet_location_asked', // true after location soft-ask shown
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
  await AsyncStorage.removeItem(KEYS.ROLE_SELECTED);
}

// Role selector: has the user ever picked a role? (first-open only)
export async function hasSelectedRole() {
  return (await AsyncStorage.getItem(KEYS.ROLE_SELECTED)) === 'true';
}

export async function setRoleSelected() {
  await AsyncStorage.setItem(KEYS.ROLE_SELECTED, 'true');
}

export async function getSearchZones() {
  const raw = await AsyncStorage.getItem(KEYS.SEARCH_ZONES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveSearchZones(zones) {
  await AsyncStorage.setItem(KEYS.SEARCH_ZONES, JSON.stringify(zones));
}

// Draft step persistence — keyed by draft ID
export async function getDraftStep(draftId) {
  const raw = await AsyncStorage.getItem(`padmagnet_draft_step_${draftId}`);
  return raw ? parseInt(raw, 10) : 0;
}

export async function saveDraftStep(draftId, step) {
  await AsyncStorage.setItem(`padmagnet_draft_step_${draftId}`, String(step));
}

export async function clearDraftStep(draftId) {
  await AsyncStorage.removeItem(`padmagnet_draft_step_${draftId}`);
}

// ── Ask Pad chat persistence ──────────────────────────
const ASKPAD_CHAT_KEY = (userId) => `@padmagnet_askpad_chat_${userId}`;
const ASKPAD_MAX_MESSAGES = 50;

export async function getAskPadChat(userId) {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(ASKPAD_CHAT_KEY(userId));
  return raw ? JSON.parse(raw) : [];
}

export async function saveAskPadChat(userId, messages) {
  if (!userId) return;
  // Keep only the most recent N messages
  const capped = messages.slice(-ASKPAD_MAX_MESSAGES);
  await AsyncStorage.setItem(ASKPAD_CHAT_KEY(userId), JSON.stringify(capped));
}

export async function clearAskPadChat(userId) {
  if (!userId) return;
  await AsyncStorage.removeItem(ASKPAD_CHAT_KEY(userId));
}

// Location soft-ask: has the user already been shown the branded pre-permission screen?
export async function hasAskedLocation() {
  return (await AsyncStorage.getItem(KEYS.LOCATION_ASKED)) === 'true';
}

export async function setLocationAsked() {
  await AsyncStorage.setItem(KEYS.LOCATION_ASKED, 'true');
}
