import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

// Default: Stuart, FL (Treasure Coast center)
const DEFAULT_LOCATION = {
  latitude: 27.1975,
  longitude: -80.2528,
};

export default function useLocation() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function getLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setPermission(status);

        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled) {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          }
        }
      } catch {
        // Keep default location
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    getLocation();
    return () => { cancelled = true; };
  }, []);

  return { location, permission, loading };
}
