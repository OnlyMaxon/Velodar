// useRoute — fetches and holds a cycling route from OpenRouteService. Live
// progress (next turn / ETA) is derived separately from the current location
// via routeProgress() in utils/geo, so this hook only owns the fetch lifecycle.

import { useCallback, useState } from 'react';
import { getBikeRoute } from '../services/routing';

export function useRoute() {
  const [route, setRoute] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);

  // from / to: { latitude, longitude }. Returns the route or null on failure.
  const fetchRoute = useCallback(async (from, to) => {
    setStatus('loading');
    setError(null);
    try {
      const r = await getBikeRoute(from, to);
      setRoute(r);
      setStatus('ready');
      return r;
    } catch (e) {
      setError(e?.message ?? 'Nie udało się wyznaczyć trasy');
      setStatus('error');
      setRoute(null);
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    setRoute(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { route, status, error, fetchRoute, clear };
}
