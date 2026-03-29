import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

// Default: Stuart, FL (Treasure Coast center)
const DEFAULT_LOCATION = {
  latitude: 27.1975,
  longitude: -80.2528,
};

export default function useLocation() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(false);

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
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
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
   * without triggering the OS dialog.
   */
  const checkExistingPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermission(status);

      if (status === 'granted') {
        setLoading(true);
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLoading(false);
        return true;
      }
      return false;
    } catch {
      setLoading(false);
      return false;
    }
  }, []);

  return { location, permission, loading, requestPermission, checkExistingPermission };
}
