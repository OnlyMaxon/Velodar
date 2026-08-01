// useSearch — debounced place search for the map search bar. Owns the query
// text, fires Photon requests ~300 ms after typing stops, and cancels stale
// in-flight requests so results never arrive out of order.

import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '../services/geocoding';

export function useSearch(near) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Keep the latest location without making it a dependency (so moving around
  // doesn't re-trigger a search — only typing does).
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await searchPlaces(q, nearRef.current, controller.signal);
        setResults(r);
      } catch (e) {
        if (e?.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const clear = () => {
    setQuery('');
    setResults([]);
    setLoading(false);
  };

  return { query, setQuery, results, loading, clear };
}
