// MapScreen — the whole MVP UI on one screen:
//  - MapView centred on the user, showing nearby report markers (live-synced).
//  - Search + cycling route (Photon geocoding + OpenRouteService), drawn as a
//    Polyline with a next-turn banner and live ETA.
//  - Speed readout + over-limit alert (useSpeedTracking, configurable via menu).
//  - Side menu (filters / speed settings / stats), "locate me", and "+" to report.
//  - Tapping a marker opens a bottom card with "actual" / "gone" voting.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useLocation } from '../hooks/useLocation';
import { useSpeedTracking } from '../hooks/useSpeedTracking';
import { useReports, createReport, castVote } from '../hooks/useReports';
import { useProximityAlerts } from '../hooks/useProximityAlerts';
import { useSearch } from '../hooks/useSearch';
import { useRoute } from '../hooks/useRoute';
import { radiusToDelta, routeProgress } from '../utils/geo';

import ReportMarker from '../components/ReportMarker';
import ReportCard from '../components/ReportCard';
import AddReportModal from '../components/AddReportModal';
import SpeedIndicator from '../components/SpeedIndicator';
import SpeedAlert from '../components/SpeedAlert';
import ProximityBanner from '../components/ProximityBanner';
import SideMenu from '../components/SideMenu';
import SearchBar from '../components/SearchBar';
import NavBanner from '../components/NavBanner';
import RoutePanel from '../components/RoutePanel';

const RADIUS_METERS = 15000; // ~15 km pull radius

// Warsaw fallback until the first fix arrives.
const FALLBACK = { latitude: 52.2297, longitude: 21.0122 };

const ALL_TYPES_VISIBLE = { police: true, camera: true, ebike_control: true };

// Keep the whole route comfortably in frame when previewing it.
const ROUTE_PADDING = { top: 150, right: 60, bottom: 250, left: 60 };

export default function MapScreen() {
  const mapRef = useRef(null);
  const centeredOnce = useRef(false);

  const { location, permissionDenied, refresh: refreshLocation } = useLocation();

  const [settings, setSettings] = useState({
    limitKmh: 25,
    alertEnabled: true,
    proximityEnabled: true,
  });
  const { speedKmh, isOverLimit, limitKmh } = useSpeedTracking({
    limitKmh: settings.limitKmh,
    alertEnabled: settings.alertEnabled,
  });

  const { reports, refresh } = useReports({ location, radiusMeters: RADIUS_METERS });

  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filters, setFilters] = useState(ALL_TYPES_VISIBLE);

  // Search + routing state.
  const search = useSearch(location);
  const { route, status: routeStatus, error: routeError, fetchRoute, clear: clearRoute } =
    useRoute();
  const [destination, setDestination] = useState(null); // { latitude, longitude, title }
  const [navigating, setNavigating] = useState(false);

  const routeActive = !!destination; // preview or navigating

  // Live turn/ETA progress, only while actually navigating.
  const progress = useMemo(
    () => (navigating && route ? routeProgress(route, location) : null),
    [navigating, route, location]
  );

  // Markers actually drawn = reports whose type is toggled on in the menu.
  const visibleReports = useMemo(
    () => reports.filter((r) => filters[r.type]),
    [reports, filters]
  );

  // Radar: warn as we approach a visible report.
  const { approaching } = useProximityAlerts({
    location,
    reports: visibleReports,
    enabled: settings.proximityEnabled,
  });

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
        latitudeDelta: 0.01, // zoom in close on "locate me"
        longitudeDelta: 0.01,
      },
      duration
    );
  };

  const recenter = () => {
    if (location) animateTo(location);
    else refreshLocation(); // no fix yet → re-request permission/position
  };

  const fitRoute = (coords) => {
    if (coords?.length) {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: ROUTE_PADDING,
        animated: true,
      });
    }
  };

  const handleAdd = async (typeId) => {
    if (!location) return;
    try {
      await createReport(typeId, location.latitude, location.longitude);
      refresh(); // realtime also delivers it; this is a safety net
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

  const toggleFilter = (typeId) =>
    setFilters((f) => ({ ...f, [typeId]: !f[typeId] }));

  const changeSettings = (partial) => setSettings((s) => ({ ...s, ...partial }));

  // --- Routing flow -------------------------------------------------------

  const handleSelectPlace = async (place) => {
    if (!location) {
      Alert.alert('Brak lokalizacji', 'Poczekaj na ustalenie Twojej pozycji.');
      return;
    }
    Keyboard.dismiss();
    setSelected(null);
    setDestination(place);
    search.clear();
    const r = await fetchRoute(location, place);
    fitRoute(r?.coordinates);
  };

  const handleRetryRoute = async () => {
    if (!location || !destination) return;
    const r = await fetchRoute(location, destination);
    fitRoute(r?.coordinates);
  };

  const handleStartNav = () => {
    setNavigating(true);
    if (location) animateTo(location, 500);
  };

  const handleCancelRoute = () => {
    setNavigating(false);
    setDestination(null);
    clearRoute();
    search.clear();
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        // Default provider: Google Maps on Android, Apple Maps on iOS.
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={() => setSelected(null)}
      >
        {visibleReports.map((r) => (
          <ReportMarker key={r.id} report={r} onPress={setSelected} />
        ))}

        {/* Cycling route overlay + destination pin. */}
        {route?.coordinates?.length > 0 && (
          <Polyline
            coordinates={route.coordinates}
            strokeColor="#2563eb"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
        {destination && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title={destination.title}
            pinColor="#2563eb"
          />
        )}
      </MapView>

      {/* Over-limit visual alert (no sound on MVP). */}
      <SpeedAlert visible={isOverLimit} limitKmh={limitKmh} />

      {/* Radar: "report ahead" banner as you approach one. */}
      <ProximityBanner approaching={approaching} />

      {/* Top bar: menu button + speed */}
      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}
          onPress={() => setMenuOpen(true)}
          hitSlop={8}
        >
          <Ionicons name="menu" size={22} color="#111827" />
          <Text style={styles.brandText}>Velodar</Text>
        </Pressable>

        <SpeedIndicator
          speedKmh={speedKmh}
          isOverLimit={isOverLimit}
          limitKmh={limitKmh}
        />
      </SafeAreaView>

      {/* Search field (idle) or next-turn banner (navigating). */}
      {navigating ? (
        <NavBanner progress={progress} />
      ) : (
        !routeActive && (
          <SearchBar
            query={search.query}
            onChangeQuery={search.setQuery}
            results={search.results}
            loading={search.loading}
            onSelect={handleSelectPlace}
            onClear={search.clear}
          />
        )
      )}

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

      {/* Bottom controls. While routing, the RoutePanel takes over the bottom
          and only "locate me" floats above it; otherwise the usual locate + add. */}
      {routeActive ? (
        <>
          <SafeAreaView style={styles.routeLocate} pointerEvents="box-none">
            <Pressable
              style={({ pressed }) => [styles.locateBtn, pressed && styles.pressed]}
              onPress={recenter}
              hitSlop={8}
            >
              <Ionicons name="locate" size={22} color="#2563eb" />
            </Pressable>
          </SafeAreaView>

          <RoutePanel
            mode={navigating ? 'nav' : 'preview'}
            destinationTitle={destination?.title}
            status={routeStatus}
            error={routeError}
            route={route}
            progress={progress}
            onStart={handleStartNav}
            onCancel={handleCancelRoute}
            onRetry={handleRetryRoute}
          />
        </>
      ) : (
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
      )}

      {/* Selected report card (hidden while the route panel owns the bottom) */}
      {selected && !routeActive && (
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

      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        filters={filters}
        onToggleFilter={toggleFilter}
        settings={settings}
        onChangeSettings={changeSettings}
        reports={reports}
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
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  brandText: { fontSize: 15, fontWeight: '800', color: '#111827' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },

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
    marginTop: 110, // below the search bar
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
  // "Locate me" floating just above the route panel while routing.
  routeLocate: {
    position: 'absolute',
    right: 16,
    bottom: 150,
    alignItems: 'flex-end',
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
