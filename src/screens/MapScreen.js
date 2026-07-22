// MapScreen — the whole MVP UI on one screen:
//  - MapView centred on the user, showing nearby report markers (live-synced).
//  - Speed readout + over-limit alert (useSpeedTracking).
//  - "Locate me" button + floating "+" to add a report at the current position.
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
import { Ionicons } from '@expo/vector-icons';

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

  const { location, permissionDenied, refresh: refreshLocation } = useLocation();
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
      animateTo(location, 600);
    }
  }, [location]);

  // Keep the selected card in sync if the underlying report updates (votes).
  useEffect(() => {
    if (!selected) return;
    const fresh = reports.find((r) => r.id === selected.id);
    if (fresh) setSelected(fresh);
    else setSelected(null); // it expired / was removed
  }, [reports, selected]);

  const animateTo = (coords, duration = 400) => {
    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        // Zoom in closer when the user taps "locate me".
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      duration
    );
  };

  const recenter = () => {
    if (location) animateTo(location);
    else refreshLocation(); // no fix yet → re-request permission/position
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

      {/* Top bar: brand + speed */}
      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <View style={styles.brand}>
          <Ionicons name="bicycle" size={18} color="#2563eb" />
          <Text style={styles.brandText}>Velodar</Text>
        </View>
        <SpeedIndicator
          speedKmh={speedKmh}
          isOverLimit={isOverLimit}
          limitKmh={SPEED_LIMIT_KMH}
        />
      </SafeAreaView>

      {permissionDenied && (
        <SafeAreaView style={styles.permWarn} pointerEvents="box-none">
          <Pressable style={styles.permPill} onPress={refreshLocation}>
            <Ionicons name="location-outline" size={16} color="#fff" />
            <Text style={styles.permText}>
              Włącz lokalizację — dotknij, aby zezwolić
            </Text>
          </Pressable>
        </SafeAreaView>
      )}

      {/* Bottom-right control stack: locate + add */}
      <SafeAreaView style={styles.controls} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.locateBtn, pressed && styles.pressed]}
          onPress={recenter}
          hitSlop={8}
        >
          <Ionicons name="locate" size={22} color="#2563eb" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setAddOpen(true)}
          disabled={!location}
          hitSlop={8}
        >
          {location ? (
            <Ionicons name="add" size={34} color="#fff" />
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

  topBar: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  brandText: { fontSize: 15, fontWeight: '800', color: '#111827' },

  permWarn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  permPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 64,
    backgroundColor: 'rgba(180,83,9,0.96)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  permText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },

  controls: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    alignItems: 'center',
    gap: 14,
  },
  locateBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  fabPressed: { backgroundColor: '#1d4ed8', transform: [{ scale: 0.96 }] },
});
