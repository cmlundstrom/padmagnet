import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// SecureStore adapter — uses iOS Keychain / Android Keystore (encrypted)
// Falls back to AsyncStorage if SecureStore native module isn't available
// (e.g., dev client built before expo-secure-store was added)
let storage = AsyncStorage;

try {
  const SecureStore = require('expo-secure-store');
  if (SecureStore?.getItemAsync) {
    storage = {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    };
  }
} catch {
  // SecureStore native module not available — using AsyncStorage fallback
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
