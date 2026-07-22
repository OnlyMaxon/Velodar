// useLocation — the user's current position for the map + report placement.
//
// Separate from useSpeedTracking on purpose: this one runs at a lower rate and
// balanced accuracy (cheaper on battery) and is the source of truth for "where
// am I" / "where to drop a new report". Speed tracking keeps its own high-rate
// watcher tuned for navigation.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export function useLocation({ enabled = true } = {}) {
  const [location, setLocation] = useState(null); // { latitude, longitude }
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState(null);
  const subRef = useRef(null);

  const stop = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);

      // Seed immediately so the map can center without waiting for the watcher.
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 4000,
          distanceInterval: 15, // metres
        },
        (loc) =>
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          })
      );
    } catch (e) {
      setError(e?.message ?? 'Location error');
    }
  }, []);

  useEffect(() => {
    if (enabled) start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { location, permissionDenied, error, refresh: start };
}
