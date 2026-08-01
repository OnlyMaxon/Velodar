// Small geo helpers used for client-side filtering of realtime rows and for
// formatting. Distances are approximate (equirectangular / haversine) — good
// enough for a 10–15 km radius decision; the authoritative spatial query runs
// server-side via PostGIS.

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Great-circle distance in metres between two {lat, lng}-ish points.
export function distanceMeters(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Convert m/s (from GPS) to km/h.
export function msToKmh(ms) {
  if (ms == null || Number.isNaN(ms) || ms < 0) return 0;
  return ms * 3.6;
}

// A rough deltaLat/deltaLng for a given radius, to size the initial map region.
export function radiusToDelta(radiusMeters, lat) {
  const latDelta = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const lngDelta = latDelta / Math.max(Math.cos(toRad(lat)), 0.01);
  // Zoom out a touch so the whole radius is comfortably in frame.
  return { latitudeDelta: latDelta * 2.2, longitudeDelta: lngDelta * 2.2 };
}

// Human distance label, Polish units. Rounds to a tidy value.
export function formatDistance(m) {
  if (m == null || Number.isNaN(m)) return '';
  if (m < 1000) return `${Math.max(0, Math.round(m / 10) * 10)} m`;
  const km = m / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

// Human duration label, Polish units.
export function formatDuration(sec) {
  if (sec == null || Number.isNaN(sec)) return '';
  const min = Math.max(0, Math.round(sec / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} godz. ${m} min` : `${h} godz.`;
}

// Live progress along a fetched route given the user's current position.
// Straight-line approximations — accurate enough for a heads-up nav banner,
// not survey grade. Returns null until we have both a route and a fix.
export function routeProgress(route, loc) {
  const coords = route?.coordinates;
  if (!coords?.length || !loc) return null;

  // Nearest route vertex to the user.
  let nearestIdx = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = distanceMeters(
      loc.latitude,
      loc.longitude,
      coords[i].latitude,
      coords[i].longitude
    );
    if (d < nearestDist) {
      nearestDist = d;
      nearestIdx = i;
    }
  }

  // Remaining distance = hop to the route + along the route to the end.
  let remaining = nearestDist;
  for (let i = nearestIdx; i < coords.length - 1; i++) {
    remaining += distanceMeters(
      coords[i].latitude,
      coords[i].longitude,
      coords[i + 1].latitude,
      coords[i + 1].longitude
    );
  }

  // Current step = the last one that has started; the upcoming maneuver is the
  // next step (or the goal, if we're on the final leg).
  const steps = route.steps || [];
  let cur = 0;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].wayPoint <= nearestIdx) cur = i;
    else break;
  }
  const currentStep = steps[cur] || null;
  const upcomingStep = steps[cur + 1] || currentStep;

  // Distance to the next turn = to the end vertex of the current step.
  const turnIdx = currentStep
    ? Math.min(currentStep.wayPointEnd, coords.length - 1)
    : nearestIdx;
  const turnPt = coords[turnIdx];
  const distToManeuver = turnPt
    ? distanceMeters(loc.latitude, loc.longitude, turnPt.latitude, turnPt.longitude)
    : 0;

  // ETA scales the total duration by the fraction of distance left.
  const frac = route.distance ? Math.min(1, remaining / route.distance) : 0;
  const etaSeconds = Math.round((route.duration || 0) * frac);

  return {
    remaining, // metres to destination
    etaSeconds,
    upcomingStep, // { instruction, type, … } — the next maneuver
    distToManeuver, // metres to that maneuver
    offRoute: nearestDist > 60, // user drifted off the drawn line
    arrived: remaining < 30,
  };
}

// "5 min temu" style relative time (Polish), coarse buckets are fine here.
export function formatAge(createdAtIso, now = Date.now()) {
  const created = new Date(createdAtIso).getTime();
  const mins = Math.max(0, Math.floor((now - created) / 60000));
  if (mins < 1) return 'przed chwilą';
  if (mins === 1) return '1 min temu';
  if (mins < 60) return `${mins} min temu`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1 godz. temu' : `${hrs} godz. temu`;
}
