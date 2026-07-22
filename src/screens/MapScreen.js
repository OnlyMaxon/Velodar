// MapScreen — the whole MVP UI on one screen:
//  - MapView centred on the user, showing nearby report markers (live-synced).
//  - Speed readout + over-limit alert (useSpeedTracking).
//  - Floating "+" to add a report at the current position.
//  - Tapping a marker opens a bottom card with "actual" / "gone" voting.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLocation } from '../hooks/useLocation';
import { useSpeedTracking } from '../hooks/useSpeedTracking';
import { useReports, createReport, castVote } from '../hooks/useReports';
import { radiusToDelta } from '../utils/geo';

import ReportMarker from '../components/ReportMarker';
import ReportCard from '../components/ReportCard';
import AddReportModal from '../components/AddReportModal';
import SpeedIndicator from '../components/SpeedIndicator';
import SpeedAlert from '../components/SpeedAlert';

const RADIUS_METERS = 15000; // ~15 km pull radius

// Warsaw fallback until the first fix arrives.
const FALLBACK = { latitude: 52.2297, longitude: 21.0122 };

export default function MapScreen() {
  const mapRef = useRef(null);
  const centeredOnce = useRef(false);

  const { location, permissionDenied } = useLocation();
  const { speedKmh, isOverLimit, SPEED_LIMIT_KMH } = useSpeedTracking();
  const { reports, refresh } = useReports({ location, radiusMeters: RADIUS_METERS });

  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const initialRegion = useMemo(() => {
    const base = location ?? FALLBACK;
    return {
      latitude: base.latitude,
      longitude: base.longitude,
      ...radiusToDelta(RADIUS_METERS, base.latitude),
    };
  }, [location]);

  // Center on the user once we get the first real fix.
  useEffect(() => {
    if (location && !centeredOnce.current && mapRef.current) {
      centeredOnce.current = true;
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          ...radiusToDelta(RADIUS_METERS, location.latitude),
        },
        600
      );
    }
  }, [location]);

  // Keep the selected card in sync if the underlying report updates (votes).
  useEffect(() => {
    if (!selected) return;
    const fresh = reports.find((r) => r.id === selected.id);
    if (fresh) setSelected(fresh);
    else setSelected(null); // it expired / was removed
  }, [reports, selected]);

  const recenter = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          ...radiusToDelta(RADIUS_METERS, location.latitude),
        },
        400
      );
    }
  };

  const handleAdd = async (typeId) => {
    if (!location) return;
    try {
      await createReport(typeId, location.latitude, location.longitude);
      // Realtime will deliver the new row; refresh as a safety net.
      refresh();
    } catch (e) {
      Alert.alert('Nie udało się dodać', e?.message ?? 'Spróbuj ponownie');
      throw e;
    }
  };

  const handleVote = async (reportId, vote) => {
    try {
      await castVote(reportId, vote);
      refresh();
    } catch (e) {
      Alert.alert('Nie udało się zagłosować', e?.message ?? 'Spróbuj ponownie');
    }
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        // Default provider: Google Maps on Android (its only option, needs an
        // API key in app config), Apple Maps on iOS (no key required).
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={() => setSelected(null)}
      >
        {reports.map((r) => (
          <ReportMarker key={r.id} report={r} onPress={setSelected} />
        ))}
      </MapView>

      {/* Over-limit visual alert (no sound on MVP). */}
      <SpeedAlert visible={isOverLimit} limitKmh={SPEED_LIMIT_KMH} />

      {/* Top-left: speed. Top area kept clear of the alert banner. */}
      <SafeAreaView style={styles.topLeft} pointerEvents="box-none">
        <SpeedIndicator
          speedKmh={speedKmh}
          isOverLimit={isOverLimit}
          limitKmh={SPEED_LIMIT_KMH}
        />
      </SafeAreaView>

      {permissionDenied && (
        <SafeAreaView style={styles.permWarn} pointerEvents="none">
          <Text style={styles.permText}>
            Włącz dostęp do lokalizacji, aby widzieć swoją pozycję i prędkość.
          </Text>
        </SafeAreaView>
      )}

      {/* Right-side controls */}
      <SafeAreaView style={styles.rightControls} pointerEvents="box-none">
        <Pressable style={styles.circleBtn} onPress={recenter}>
          <Text style={styles.circleIcon}>🎯</Text>
        </Pressable>
      </SafeAreaView>

      {/* Floating add button */}
      <SafeAreaView style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setAddOpen(true)}
          disabled={!location}
        >
          {location ? (
            <Text style={styles.fabIcon}>＋</Text>
          ) : (
            <ActivityIndicator color="#fff" />
          )}
        </Pressable>
      </SafeAreaView>

      {/* Selected report card */}
      {selected && (
        <ReportCard
          report={selected}
          onVote={handleVote}
          onClose={() => setSelected(null)}
        />
      )}

      <AddReportModal
        visible={addOpen}
        coords={location}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e5e7eb' },
  topLeft: {
    position: 'absolute',
    top: 0,
    left: 12,
    alignItems: 'flex-start',
  },
  permWarn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  permText: {
    marginTop: 8,
    backgroundColor: 'rgba(180,83,9,0.95)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },
  rightControls: {
    position: 'absolute',
    right: 16,
    bottom: 150,
    alignItems: 'center',
    gap: 12,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  circleIcon: { fontSize: 20 },
  fabWrap: {
    position: 'absolute',
    right: 16,
    bottom: 0,
    marginBottom: 28,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabPressed: { backgroundColor: '#1d4ed8', transform: [{ scale: 0.96 }] },
  fabIcon: { color: '#fff', fontSize: 34, fontWeight: '700', lineHeight: 36 },
});
