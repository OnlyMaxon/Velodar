// useSpeedTracking — live speed from GPS with noise smoothing + a debounced
// over-limit alert.
//
// Why the extra work over just reading coords.speed:
//  - coords.speed is often null or -1 (no fix / device doesn't report it).
//  - Even when present it is jittery; raw values flicker several km/h.
// So we:
//  1. Prefer coords.speed, fall back to distance/time between fixes.
//  2. Drop physically-impossible jumps (GPS teleports) and poor-accuracy fixes.
//  3. Take the MEDIAN of a short window (robust to single spikes)…
//  4. …then an exponential moving average for a smooth on-screen number.
//  5. Clamp tiny values to 0 so standing still doesn't show phantom speed.
//
// Alerting uses hysteresis (on at 28, off at 25) so the warning doesn't
// flicker around the 25 km/h limit.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { distanceMeters, msToKmh } from '../utils/geo';

export const SPEED_LIMIT_KMH = 25; // default legal assist limit (PL e-bike)
const ALERT_BUFFER_KMH = 3; // warn this much OVER the limit (anti-flicker buffer)

const WINDOW = 5; // samples kept for the median
const EMA_ALPHA = 0.4; // 0..1 — higher = snappier, lower = smoother
const ZERO_CLAMP_KMH = 2; // below this we treat as stationary (GPS drift)
const MAX_PLAUSIBLE_KMH = 120; // reject derived speeds above this as GPS jumps
const MAX_ACCURACY_M = 50; // ignore fixes worse than this (metres)

function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function useSpeedTracking({
  enabled = true,
  limitKmh = SPEED_LIMIT_KMH,
  alertEnabled = true,
} = {}) {
  const [speedKmh, setSpeedKmh] = useState(0);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  const subRef = useRef(null);
  const windowRef = useRef([]); // recent raw km/h samples
  const emaRef = useRef(0); // smoothed value
  const lastFixRef = useRef(null); // { lat, lng, t } for fallback derivation
  const overRef = useRef(false); // current hysteresis state

  // Live settings via refs so changing them doesn't restart the GPS watcher.
  const limitRef = useRef(limitKmh);
  const alertEnabledRef = useRef(alertEnabled);
  useEffect(() => {
    limitRef.current = limitKmh;
    alertEnabledRef.current = alertEnabled;
    // Clear an active alert immediately if it was turned off / limit raised.
    if (overRef.current && (!alertEnabled || speedKmh < limitKmh)) {
      overRef.current = false;
      setIsOverLimit(false);
    }
  }, [limitKmh, alertEnabled, speedKmh]);

  const reset = () => {
    windowRef.current = [];
    emaRef.current = 0;
    lastFixRef.current = null;
    overRef.current = false;
  };

  const handleFix = useCallback((loc) => {
    const { coords, timestamp } = loc;
    if (coords.accuracy != null && coords.accuracy > MAX_ACCURACY_M) {
      return; // too imprecise to trust for speed
    }

    // 1) raw speed in km/h — prefer device-reported, else derive.
    let rawKmh;
    if (coords.speed != null && coords.speed >= 0) {
      rawKmh = msToKmh(coords.speed);
    } else if (lastFixRef.current) {
      const prev = lastFixRef.current;
      const dtSec = (timestamp - prev.t) / 1000;
      if (dtSec <= 0.3) return; // fixes too close together → unreliable
      const dMeters = distanceMeters(
        prev.lat,
        prev.lng,
        coords.latitude,
        coords.longitude
      );
      rawKmh = msToKmh(dMeters / dtSec);
    } else {
      rawKmh = 0;
    }

    lastFixRef.current = {
      lat: coords.latitude,
      lng: coords.longitude,
      t: timestamp,
    };

    // 2) reject GPS teleports.
    if (rawKmh > MAX_PLAUSIBLE_KMH) return;

    // 3) median over a short window.
    const w = windowRef.current;
    w.push(rawKmh);
    if (w.length > WINDOW) w.shift();
    const med = median(w);

    // 4) exponential moving average for a smooth readout.
    emaRef.current = EMA_ALPHA * med + (1 - EMA_ALPHA) * emaRef.current;

    // 5) clamp stationary drift to zero.
    const smoothed = emaRef.current < ZERO_CLAMP_KMH ? 0 : emaRef.current;
    setSpeedKmh(smoothed);

    // Alert with hysteresis (on at limit+buffer, off at limit).
    const alertOn = limitRef.current + ALERT_BUFFER_KMH;
    const alertOff = limitRef.current;
    if (alertEnabledRef.current && !overRef.current && smoothed >= alertOn) {
      overRef.current = true;
      setIsOverLimit(true);
    } else if (overRef.current && smoothed < alertOff) {
      overRef.current = false;
      setIsOverLimit(false);
    }
  }, []);

  const stop = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    setIsTracking(false);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Brak zgody na lokalizację');
        return;
      }
      reset();
      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // ~1 Hz is plenty for speed
          distanceInterval: 0, // time-based updates so we still update when slow
        },
        handleFix
      );
      setIsTracking(true);
    } catch (e) {
      setError(e?.message ?? 'Location error');
      setIsTracking(false);
    }
  }, [handleFix]);

  useEffect(() => {
    if (enabled) start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { speedKmh, isOverLimit, isTracking, error, start, stop, limitKmh };
}
