// RoutePanel — the bottom sheet for the routing flow. Two modes:
//   'preview'  → destination chosen, route drawn: title + distance/ETA +
//                [Rozpocznij] / [Anuluj].
//   'nav'      → navigating: live remaining distance + ETA + [Zakończ].
// Also renders a compact loading / error state for the preview fetch.

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistance, formatDuration } from '../utils/geo';

export default function RoutePanel({
  mode, // 'preview' | 'nav'
  destinationTitle,
  status, // 'loading' | 'ready' | 'error'
  error,
  route, // { distance, duration }
  progress, // live progress (nav mode)
  onStart,
  onCancel,
  onRetry,
}) {
  return (
    <SafeAreaView style={styles.wrap} pointerEvents="box-none" edges={['bottom']}>
      <View style={styles.card}>
        {/* Loading the route */}
        {mode === 'preview' && status === 'loading' && (
          <View style={styles.centerRow}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.loadingText}>Wyznaczam trasę…</Text>
            <Pressable onPress={onCancel} hitSlop={10} style={styles.closeInline}>
              <Ionicons name="close" size={20} color="#9ca3af" />
            </Pressable>
          </View>
        )}

        {/* Route failed */}
        {mode === 'preview' && status === 'error' && (
          <View>
            <View style={styles.header}>
              <Ionicons name="alert-circle" size={22} color="#dc2626" />
              <Text style={styles.errorText} numberOfLines={2}>
                {error || 'Nie udało się wyznaczyć trasy'}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
                onPress={onCancel}
              >
                <Text style={styles.btnGhostText}>Anuluj</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
                onPress={onRetry}
              >
                <Text style={styles.btnPrimaryText}>Spróbuj ponownie</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Route ready → preview with Start */}
        {mode === 'preview' && status === 'ready' && route && (
          <View>
            <View style={styles.header}>
              <View style={styles.pin}>
                <Ionicons name="flag" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {destinationTitle || 'Cel'}
                </Text>
                <Text style={styles.meta}>
                  🚴 {formatDistance(route.distance)} ·{' '}
                  {formatDuration(route.duration)}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
                onPress={onCancel}
              >
                <Text style={styles.btnGhostText}>Anuluj</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
                onPress={onStart}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Rozpocznij</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Navigating → live stats + end */}
        {mode === 'nav' && (
          <View style={styles.navRow}>
            <View style={styles.navStats}>
              <Text style={styles.navEta}>
                {formatDuration(progress?.etaSeconds ?? route?.duration)}
              </Text>
              <Text style={styles.navRemaining}>
                {progress?.arrived
                  ? 'Dojechałeś na miejsce'
                  : `${formatDistance(progress?.remaining ?? route?.distance)} do celu`}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.btnEnd, pressed && styles.pressed]}
              onPress={onCancel}
            >
              <Text style={styles.btnEndText}>Zakończ</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },

  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loadingText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },
  closeInline: { padding: 2 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 13.5, fontWeight: '600', color: '#6b7280', marginTop: 2 },
  errorText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#b91c1c' },

  actions: { flexDirection: 'row', gap: 10 },
  btnGhost: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  btnGhostText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  btnPrimary: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navStats: { flex: 1 },
  navEta: { fontSize: 22, fontWeight: '900', color: '#111827' },
  navRemaining: { fontSize: 13.5, fontWeight: '600', color: '#6b7280', marginTop: 1 },
  btnEnd: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#dc2626',
  },
  btnEndText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
