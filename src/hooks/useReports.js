// useReports — nearby reports + live sync.
//
// Two data paths:
//  1. Pull: `nearby_reports` RPC (PostGIS) gives the authoritative set within
//     `radiusMeters` of the user. Called on mount, when the user moves enough,
//     and on manual refresh.
//  2. Push: a Supabase Realtime channel on the `reports` table. On any
//     INSERT/UPDATE/DELETE we reconcile the local list so a report someone
//     nearby just added (or a vote that flipped is_active) shows up instantly
//     without a reload.
//
// Realtime rows don't carry `distance_m`/`my_vote` (those are computed by the
// RPC), so we filter inserts by distance client-side and let the next pull
// backfill `my_vote`.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, ensureSession } from '../services/supabase';
import { distanceMeters } from '../utils/geo';

const REFETCH_MOVE_METERS = 3000; // re-pull once the user drifts this far

function isVisible(row, now = Date.now()) {
  return (
    row.is_active &&
    row.expires_at &&
    new Date(row.expires_at).getTime() > now
  );
}

export function useReports({ location, radiusMeters = 15000 }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lastFetchCenterRef = useRef(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  const fetchNearby = useCallback(
    async (center) => {
      if (!center) return;
      setLoading(true);
      setError(null);
      try {
        await ensureSession();
        const { data, error: rpcError } = await supabase.rpc('nearby_reports', {
          in_lat: center.latitude,
          in_lng: center.longitude,
          radius_m: radiusMeters,
        });
        if (rpcError) throw rpcError;
        lastFetchCenterRef.current = center;
        setReports((data ?? []).filter((r) => isVisible(r)));
      } catch (e) {
        setError(e?.message ?? 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    },
    [radiusMeters]
  );

  // Reconcile a single realtime row into local state.
  const upsertRow = useCallback(
    (row) => {
      const center = locationRef.current;
      if (!center || !row) return;

      // If it fell out of view (expired / voted gone), drop it.
      if (!isVisible(row)) {
        setReports((prev) => prev.filter((r) => r.id !== row.id));
        return;
      }
      // Only keep it if within our radius.
      const dist = distanceMeters(
        center.latitude,
        center.longitude,
        row.lat,
        row.lng
      );
      if (dist > radiusMeters) return;

      setReports((prev) => {
        const idx = prev.findIndex((r) => r.id === row.id);
        const merged = {
          ...(idx >= 0 ? prev[idx] : {}),
          ...row,
          distance_m: dist,
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = merged;
          return next;
        }
        return [...prev, merged];
      });
    },
    [radiusMeters]
  );

  // Initial + move-triggered pulls.
  useEffect(() => {
    if (!location) return;
    const last = lastFetchCenterRef.current;
    const moved =
      !last ||
      distanceMeters(
        last.latitude,
        last.longitude,
        location.latitude,
        location.longitude
      ) > REFETCH_MOVE_METERS;
    if (moved) fetchNearby(location);
  }, [location, fetchNearby]);

  // Realtime subscription (once).
  useEffect(() => {
    let channel;
    (async () => {
      await ensureSession();
      channel = supabase
        .channel('reports-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reports' },
          (payload) => {
            if (payload.eventType === 'DELETE') {
              setReports((prev) => prev.filter((r) => r.id !== payload.old.id));
            } else {
              upsertRow(payload.new);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [upsertRow]);

  // Prune expired rows locally every 30s so markers disappear on time even if
  // the server-side cron/realtime update is delayed.
  useEffect(() => {
    const id = setInterval(() => {
      setReports((prev) => prev.filter((r) => isVisible(r)));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(
    () => fetchNearby(locationRef.current),
    [fetchNearby]
  );

  return { reports, loading, error, refresh };
}

// Fire-and-forget writers used by the UI.
export async function createReport(type, latitude, longitude) {
  await ensureSession();
  const { data, error } = await supabase.rpc('create_report', {
    in_type: type,
    in_lat: latitude,
    in_lng: longitude,
  });
  if (error) throw error;
  return data; // new report id
}

export async function castVote(reportId, vote /* 'up' | 'down' */) {
  await ensureSession();
  const { error } = await supabase.rpc('cast_vote', {
    in_report_id: reportId,
    in_vote: vote,
  });
  if (error) throw error;
}
