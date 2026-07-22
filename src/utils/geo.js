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
