import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default: Stuart, FL (Treasure Coast center) — used as map fallback only
export const DEFAULT_LOCATION = {
  latitude: 27.1975,
  longitude: -80.2528,
};

// AsyncStorage key — mirrors the owner side's `owner_cached_coords` pattern
// in ManilaFolderStack so both surfaces render instantly with last-known
// coords on subsequent mounts / role switches instead of blocking on fresh GPS.
const CACHE_KEY = 'tenant_cached_coords';

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hydrate from cache on mount — produces an instant render with the last
  // GPS fix instead of stalling for ~10s on getCurrentPositionAsync every
  // time a dual-role user flips tenant side via RoleSwitcher. Without this
  // the swipe deck sat on the Miami fallback until fresh GPS resolved.
  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((cached) => {
        if (!cached) return;
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.latitude && parsed?.longitude) {
            setLocation(parsed);
          }
        } catch {}
      })
      .catch(() => {});
  }, []);

  const saveToCache = (coords) => {
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(coords)).catch(() => {});
  };

  /**
   * Manually request location permission and fetch position.
   * Called AFTER the soft-ask overlay — never fires automatically.
   * Returns true if permission was granted.
   */
  const requestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status);

      if (status === 'granted') {
        // Accuracy.Low matches the owner side's ManilaFolderStack pattern —
        // Balanced was ~2-3x slower on first fix with no UX payoff for our
        // 10-mile-radius rental search granularity.
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setLocation(coords);
        saveToCache(coords);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if permission was already granted (e.g. on subsequent visits)
   * without triggering the OS dialog. Fresh GPS updates state + cache in
   * background — caller renders immediately with hydrated cache coords.
   */
  const checkExistingPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermission(status);

      if (status === 'granted') {
        setLoading(true);
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setLocation(coords);
        saveToCache(coords);
        setLoading(false);
        return true;
      }
      return false;
    } catch {
      setLoading(false);
      return false;
    }
  }, []);

  // For consumers that need a fallback (e.g. MapView), expose resolved or default
  const locationOrDefault = location || DEFAULT_LOCATION;

  return { location, locationOrDefault, permission, loading, requestPermission, checkExistingPermission };
}
