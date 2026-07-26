// useProximityAlerts — the "radar" bit: warn as you approach a report.
//
// As the user's position updates, we find the nearest report within ENTER_M.
// The first time a report enters that zone we fire a haptic (once), and expose
// it (+live distance) for the on-screen banner. A report is only re-armed for a
// new alert after the user has moved beyond EXIT_M (hysteresis), so a single
// report doesn't buzz repeatedly while you linger near it.
//
// Direction-awareness (only warn for things ahead) is a future refinement;
// v1 alerts on proximity regardless of heading.

import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { distanceMeters } from '../utils/geo';

const ENTER_M = 400; // start warning within this distance (~60 s at 24 km/h)
const EXIT_M = 600; // treat as "passed" beyond this → re-arm for next time

export function useProximityAlerts({ location, reports, enabled = true }) {
  const [approaching, setApproaching] = useState(null); // { report, distance } | null
  const armedRef = useRef(new Set()); // ids already alerted this pass

  useEffect(() => {
    if (!enabled || !location) {
      setApproaching(null);
      return;
    }

    let nearest = null;
    const withinExit = new Set();

    for (const r of reports) {
      const d = distanceMeters(
        location.latitude,
        location.longitude,
        r.lat,
        r.lng
      );
      if (d <= EXIT_M) withinExit.add(r.id);
      if (d <= ENTER_M && (!nearest || d < nearest.distance)) {
        nearest = { report: r, distance: d };
      }
    }

    // Re-arm reports the user has left (so approaching them again alerts anew).
    for (const id of [...armedRef.current]) {
      if (!withinExit.has(id)) armedRef.current.delete(id);
    }

    // Newly-entered report → single haptic pulse.
    if (nearest && !armedRef.current.has(nearest.report.id)) {
      armedRef.current.add(nearest.report.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {}
      );
    }

    setApproaching(nearest);
  }, [location, reports, enabled]);

  return { approaching };
}
