// Cycling routing via OpenRouteService. We use the `cycling-electric` profile
// to match Velodar's e-bike audience. The base map stays Apple/Google Maps —
// this only computes the path + turn instructions, which the map draws as a
// Polyline overlay.
//
// Requires EXPO_PUBLIC_ORS_API_KEY (free token from openrouteservice.org).

import Constants from 'expo-constants';

const PROFILE = 'cycling-electric';
const ORS_URL = `https://api.openrouteservice.org/v2/directions/${PROFILE}/geojson`;

function apiKey() {
  return (
    process.env.EXPO_PUBLIC_ORS_API_KEY ||
    Constants.expoConfig?.extra?.orsApiKey ||
    ''
  );
}

// from / to: { latitude, longitude } · signal: AbortSignal (optional)
// Returns { coordinates:[{latitude,longitude}], steps:[…], distance, duration }.
export async function getBikeRoute(from, to, signal) {
  const key = apiKey();
  if (!key) throw new Error('Brak klucza ORS (EXPO_PUBLIC_ORS_API_KEY)');

  const res = await fetch(ORS_URL, {
    method: 'POST',
    signal,
    headers: {
      Authorization: key,
      'Content-Type': 'application/json',
      Accept: 'application/geo+json',
    },
    body: JSON.stringify({
      coordinates: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude],
      ],
      language: 'pl', // turn instructions in Polish
      instructions: true,
      units: 'm',
    }),
  });

  if (!res.ok) {
    let msg = `ORS ${res.status}`;
    try {
      const err = await res.json();
      msg = err?.error?.message || err?.error || msg;
    } catch (_) {
      /* body wasn't JSON — keep the status message */
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error('Nie znaleziono trasy');

  // GeoJSON LineString is [lng, lat] pairs → react-native-maps wants {lat,lng}.
  const coordinates = (feature.geometry?.coordinates || []).map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  const summary = feature.properties?.summary || {};
  const steps = [];
  for (const seg of feature.properties?.segments || []) {
    for (const st of seg.steps || []) {
      const wp = Array.isArray(st.way_points) ? st.way_points : [0, 0];
      steps.push({
        instruction: st.instruction, // e.g. "Skręć w prawo w ul. …"
        distance: st.distance, // metres covered by this step
        duration: st.duration, // seconds
        type: st.type, // ORS maneuver code (0–13)
        name: st.name && st.name !== '-' ? st.name : '',
        wayPoint: wp[0], // index into `coordinates` where the step starts
        wayPointEnd: wp[1], // …and where it ends (the next maneuver)
      });
    }
  }

  return {
    coordinates,
    steps,
    distance: summary.distance ?? 0, // total metres
    duration: summary.duration ?? 0, // total seconds
  };
}
