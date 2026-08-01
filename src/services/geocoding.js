// Geocoding via Photon (Komoot) — free, keyless, OpenStreetMap-based search
// with autocomplete. We bias results toward the user's current location so a
// query like "Rynek" prefers the nearest match.
//
// Returns a normalized shape the UI can render directly:
//   { id, latitude, longitude, title, subtitle }

const PHOTON_URL = 'https://photon.komoot.io/api/';

// Build a two-line label out of Photon's free-form OSM properties.
function labelFor(props) {
  const title = props.name || props.street || props.city || props.country || '';
  const place = props.city || props.town || props.village || props.county;
  const detail = [
    props.street && props.housenumber
      ? `${props.street} ${props.housenumber}`
      : props.street,
    place,
    props.state,
  ]
    .filter(Boolean)
    .filter((p) => p !== title)
    .join(', ');
  return { title: title || detail || 'Nieznane miejsce', subtitle: detail };
}

// query: string · near: { latitude, longitude } | null · signal: AbortSignal
export async function searchPlaces(query, near, signal) {
  const q = (query || '').trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({ q, limit: '6', lang: 'default' });
  if (near) {
    params.set('lat', String(near.latitude));
    params.set('lon', String(near.longitude));
  }

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);

  const data = await res.json();
  return (data.features || [])
    .filter((f) => f.geometry?.coordinates?.length === 2)
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const { title, subtitle } = labelFor(f.properties || {});
      return {
        id: `${lat.toFixed(6)},${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng,
        title,
        subtitle,
      };
    });
}
